import logging
import re
from enum import Enum
from typing import Any, Dict, List, Optional

import httpx

from app.app.conversation.message_builder import MessageBuilder
from app.app.models.conversation_history import ChannelType, ConversationHistory, SenderType
from app.app.services.order_service import OrderService
from app.app.services.payment.payment_service import PaymentService


class ChatStep(str, Enum):
    ASK_NAME = "ask_name"
    ASK_PHONE = "ask_phone"
    ASK_ADDRESS = "ask_address"
    ASK_PAYMENT = "ask_payment_method"
    CONFIRM = "confirm_order"
    COMPLETE = "complete"


class ChatFlowEngine:
    """
    Stateful conversational checkout engine for chat channels (WhatsApp, SMS, Telegram, etc).
    Handles step transitions, input validation, retries, and order/payment integration.
    """

    def __init__(
        self,
        tenant_id: str,
        user_id: Optional[str],
        db,
        channel: ChannelType,
        phone_number: str,
    ):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.db = db
        self.channel = channel
        self.phone_number = phone_number
        self.message_builder = MessageBuilder()
        self.payment_service = PaymentService(db)
        self.order_service = OrderService(db)
        self.state = self._load_state()
        self.max_retries = 3

    def _load_state(self) -> Dict[str, Any]:
        # Load or initialize conversation state from ConversationHistory
        history = (
            self.db.query(ConversationHistory)
            .filter_by(
                sender_type=SenderType.CUSTOMER,
                channel=self.channel,
                phone_number=self.phone_number,
                tenant_id=self.tenant_id,
            )
            .order_by(ConversationHistory.timestamp.desc())
            .first()
        )
        if history and history.context:
            return history.context
        return {"step": ChatStep.ASK_NAME, "retries": 0, "data": {}}

    def _save_state(self):
        # Save current state to ConversationHistory (or a session table)
        # Store the state as a JSON-serializable dict in the latest ConversationHistory for this user/channel
        history = (
            self.db.query(ConversationHistory)
            .filter_by(
                sender_type=SenderType.CUSTOMER,
                channel=self.channel,
                phone_number=self.phone_number,
                tenant_id=self.tenant_id,
            )
            .order_by(ConversationHistory.timestamp.desc())
            .first()
        )
        if history:
            history.context = self.state
            self.db.commit()

    def handle_input(self, message: str) -> List[Dict[str, Any]]:
        """
        Main entry: process user input, advance flow, validate, and return response messages.
        Now posts to the unified /api/v1/orders endpoint with channel metadata for order creation.
        """
        step = self.state.get("step", ChatStep.ASK_NAME)
        data = self.state.setdefault("data", {})
        retries = self.state.get("retries", 0)
        messages = []
        logging.info(
            f"[ChatFlow] Step: {step}, Retries: {retries}, Message: '{message}'"
        )

        # Support edit/cancel intents
        if self._is_cancel_intent(message):
            logging.info(
                f"[ChatFlow] Cancel intent detected. Resetting state.")
            self.state = {"step": ChatStep.ASK_NAME, "retries": 0, "data": {}}
            messages.append(
                self.message_builder.text_message(
                    "Order cancelled. If you'd like to start again, please tell me your name."
                )
            )
            self._save_state()
            return messages
        if self._is_edit_intent(message):
            edit_step = self._parse_edit_step(message)
            if edit_step:
                logging.info(
                    f"[ChatFlow] Edit intent detected. Jumping to step: {edit_step}"
                )
                self.state["step"] = edit_step
                self.state["retries"] = 0
                messages.append(self._prompt_for_step(edit_step))
                self._save_state()
                return messages

        # Step logic
        if step == ChatStep.ASK_NAME:
            if not self._validate_name(message):
                logging.warning(f"[ChatFlow] Invalid name input: '{message}'")
                return self._retry_or_fail(
                    ChatStep.ASK_NAME, "Please enter a valid name."
                )
            data["name"] = message.strip()
            self.state["step"] = ChatStep.ASK_PHONE
            self.state["retries"] = 0
            logging.info(f"[ChatFlow] Name accepted. Moving to ASK_PHONE.")
            messages.append(self._prompt_for_step(ChatStep.ASK_PHONE))
        elif step == ChatStep.ASK_PHONE:
            if not self._validate_phone(message):
                logging.warning(f"[ChatFlow] Invalid phone input: '{message}'")
                return self._retry_or_fail(
                    ChatStep.ASK_PHONE,
                    "That doesn't look like a valid phone number. Please try again.",
                )
            data["phone"] = message.strip()
            self.state["step"] = ChatStep.ASK_ADDRESS
            self.state["retries"] = 0
            logging.info(f"[ChatFlow] Phone accepted. Moving to ASK_ADDRESS.")
            messages.append(self._prompt_for_step(ChatStep.ASK_ADDRESS))
        elif step == ChatStep.ASK_ADDRESS:
            if not self._validate_address(message):
                logging.warning(
                    f"[ChatFlow] Invalid address input: '{message}'")
                return self._retry_or_fail(
                    ChatStep.ASK_ADDRESS,
                    "That doesn't look like a valid address. Please try again.",
                )
            data["address"] = message.strip()
            self.state["step"] = ChatStep.ASK_PAYMENT
            self.state["retries"] = 0
            logging.info(
                f"[ChatFlow] Address accepted. Moving to ASK_PAYMENT.")
            messages.append(self._prompt_for_step(ChatStep.ASK_PAYMENT))
        elif step == ChatStep.ASK_PAYMENT:
            enabled_methods = self.payment_service.get_enabled_payment_methods(
                self.tenant_id
            )
            if message.lower() not in [m.lower() for m in enabled_methods]:
                logging.warning(
                    f"[ChatFlow] Invalid payment method: '{message}'. Enabled: {enabled_methods}"
                )
                return self._retry_or_fail(
                    ChatStep.ASK_PAYMENT,
                    f"Please select a valid payment method: {', '.join(enabled_methods)}",
                )
            data["payment_method"] = message.strip().upper()
            self.state["step"] = ChatStep.CONFIRM
            self.state["retries"] = 0
            logging.info(
                f"[ChatFlow] Payment method accepted. Moving to CONFIRM.")
            messages.append(self._order_summary())
            messages.append(
                self.message_builder.text_message(
                    "Reply 'confirm' to place your order, or 'edit' to change details."
                )
            )
        elif step == ChatStep.CONFIRM:
            if message.strip().lower() == "confirm":
                try:
                    logging.info(
                        f"[ChatFlow] Confirming order. Creating order via unified API and generating payment link."
                    )
                    # Build order payload matching backend schema
                    order_payload = {
                        "buyer_name": data.get("name"),
                        "buyer_phone": data.get("phone", self.phone_number),
                        "buyer_address": data.get("address"),
                        "quantity": 1,  # For demo; extend for multi-item carts
                        "total_amount": 1000,  # Replace with real total
                        "product_id": "demo-product-id",  # Replace with real product
                        "order_source": str(self.channel.value),
                        "channel": str(self.channel.value),
                    }
                    # POST to /api/v1/orders
                    api_url = "http://localhost:8000/api/v1/orders"
                    with httpx.Client() as client:
                        resp = client.post(api_url, json=order_payload)
                        if resp.status_code == 201:
                            order = resp.json()
                            payment_link = self.payment_service.generate_payment_link(
                                order, data["payment_method"]
                            )
                            messages.append(
                                self.message_builder.text_message(
                                    f"Order placed! Pay here: {payment_link}"
                                )
                            )
                            messages.append(
                                self.message_builder.text_message(
                                    "You'll receive a receipt once payment is confirmed."
                                )
                            )
                            self.state["step"] = ChatStep.COMPLETE
                            self.state["retries"] = 0
                            logging.info(
                                f"[ChatFlow] Order created via API and payment link sent. Moving to COMPLETE."
                            )
                        else:
                            logging.error(
                                f"[ChatFlow] API order creation failed: {resp.text}"
                            )
                            messages.append(
                                self.message_builder.text_message(
                                    "Sorry, there was an error placing your order. Please try again later."
                                )
                            )
                except Exception as e:
                    logging.error(
                        f"[ChatFlow] Error during order/payment: {str(e)}")
                    messages.append(
                        self.message_builder.text_message(
                            "Sorry, there was an error placing your order. Please try again later."
                        )
                    )
            else:
                logging.warning(
                    f"[ChatFlow] Invalid confirm input: '{message}'")
                return self._retry_or_fail(
                    ChatStep.CONFIRM,
                    "Please reply 'confirm' to place your order, or 'edit' to change details.",
                )
        elif step == ChatStep.COMPLETE:
            logging.info(
                f"[ChatFlow] Order complete for phone {self.phone_number}.")
            messages.append(
                self.message_builder.text_message(
                    "Your order is complete. Thank you!")
            )
        self._save_state()
        return messages

    def _prompt_for_step(self, step: ChatStep) -> Dict[str, Any]:
        prompts = {
            ChatStep.ASK_NAME: self.message_builder.text_message(
                "Welcome! What's your name?"
            ),
            ChatStep.ASK_PHONE: self.message_builder.text_message(
                "What's your phone number?"
            ),
            ChatStep.ASK_ADDRESS: self.message_builder.text_message(
                "What's your delivery address?"
            ),
            ChatStep.ASK_PAYMENT: self.message_builder.text_message(
                "How would you like to pay? (e.g. Paystack, M-Pesa, Flutterwave, Stripe)"
            ),
        }
        return prompts.get(
            step, self.message_builder.text_message(
                "Let's continue your order.")
        )

    def _order_summary(self) -> Dict[str, Any]:
        data = self.state.get("data", {})
        summary = f"Order summary:\nName: {data.get('name')}\nPhone: {data.get('phone')}\nAddress: {data.get('address')}\nPayment: {data.get('payment_method')}"
        return self.message_builder.text_message(summary)

    def _retry_or_fail(self, step: ChatStep, error_msg: str) -> List[Dict[str, Any]]:
        self.state["retries"] = self.state.get("retries", 0) + 1
        if self.state["retries"] >= self.max_retries:
            self.state = {"step": ChatStep.ASK_NAME, "retries": 0, "data": {}}
            return [
                self.message_builder.text_message(error_msg),
                self.message_builder.text_message(
                    "Too many failed attempts. Order cancelled. Please start again."
                ),
            ]
        else:
            return [
                self.message_builder.text_message(error_msg),
                self._prompt_for_step(step),
            ]

    def _validate_name(self, name: str) -> bool:
        return bool(name and len(name.strip()) >= 2)

    def _validate_phone(self, phone: str) -> bool:
        # Simple phone validation (can use phonenumbers lib)
        return bool(re.match(r"^\+?\d{7,15}$", phone.strip()))

    def _validate_address(self, address: str) -> bool:
        return bool(address and len(address.strip()) >= 5)

    def _is_cancel_intent(self, message: str) -> bool:
        return message.strip().lower() in ["cancel", "stop", "abort"]

    def _is_edit_intent(self, message: str) -> bool:
        return message.strip().lower().startswith("edit")

    def _parse_edit_step(self, message: str) -> Optional[ChatStep]:
        msg = message.strip().lower()
        if "name" in msg:
            return ChatStep.ASK_NAME
        if "phone" in msg:
            return ChatStep.ASK_PHONE
        if "address" in msg:
            return ChatStep.ASK_ADDRESS
        if "payment" in msg:
            return ChatStep.ASK_PAYMENT
        return None
