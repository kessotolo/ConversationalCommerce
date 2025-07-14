import hashlib
import hmac
import json
from abc import ABC, abstractmethod
from typing import Dict, Optional

import requests

from app.app.core.logging import logger
from app.app.schemas.payment.payment import (
    Money,
    PaymentInitializeRequest,
    PaymentInitializeResponse,
    PaymentMethod,
    PaymentProvider,
    PaymentVerificationResponse,
    TransactionFee,
)


class PaymentProviderInterface(ABC):
    """Abstract base class for payment providers"""

    @abstractmethod
    def initialize_payment(
        self, request: PaymentInitializeRequest
    ) -> PaymentInitializeResponse:
        """Initialize a payment transaction"""
        pass

    @abstractmethod
    def verify_payment(self, reference: str) -> PaymentVerificationResponse:
        """Verify a payment transaction"""
        pass

    @abstractmethod
    def validate_webhook(self, payload: bytes, signature: str) -> bool:
        """Validate webhook signature"""
        pass


class PaystackProvider(PaymentProviderInterface):
    """Paystack payment provider implementation"""

    def __init__(self, secret_key: str, public_key: str):
        self.secret_key = secret_key
        self.public_key = public_key
        self.base_url = "https://api.paystack.co"

    def initialize_payment(
        self, request: PaymentInitializeRequest
    ) -> PaymentInitializeResponse:
        """Initialize a payment with Paystack"""
        try:
            # Convert amount to kobo/cents as required by Paystack
            amount_in_kobo = int(request.amount.value * 100)

            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "email": request.customer_email,
                "amount": amount_in_kobo,
                "currency": request.amount.currency,
                "reference": f"order_{request.order_id}_{request.provider}",
                "callback_url": request.redirect_url,
                "metadata": {
                    "order_id": request.order_id,
                    "customer_name": request.customer_name,
                    **request.metadata,
                },
            }

            response = requests.post(
                f"{self.base_url}/transaction/initialize", headers=headers, json=payload
            )

            response.raise_for_status()
            data = response.json()

            if data["status"]:
                return PaymentInitializeResponse(
                    checkout_url=data["data"]["authorization_url"],
                    reference=data["data"]["reference"],
                    access_code=data["data"]["access_code"],
                    payment_link=data["data"]["authorization_url"],
                )
            else:
                logger.error(f"Paystack initialization failed: {data}")
                raise Exception(data["message"])

        except requests.RequestException as e:
            logger.error(f"Error initializing Paystack payment: {str(e)}")
            raise Exception(f"Payment initialization failed: {str(e)}")

    def verify_payment(self, reference: str) -> PaymentVerificationResponse:
        """Verify payment with Paystack"""
        try:
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
            }

            response = requests.get(
                f"{self.base_url}/transaction/verify/{reference}", headers=headers
            )

            response.raise_for_status()
            data = response.json()

            if data["status"] and data["data"]["status"] == "success":
                # Extract amount and convert from kobo/cents
                amount_value = float(data["data"]["amount"]) / 100
                currency = data["data"]["currency"]

                # Extract fees if available
                fee_value = float(data["data"].get("fees", 0)) / 100

                return PaymentVerificationResponse(
                    success=True,
                    reference=reference,
                    amount=Money(value=amount_value, currency=currency),
                    provider=PaymentProvider.PAYSTACK,
                    provider_reference=data["data"].get("id"),
                    transaction_date=data["data"]["paid_at"],
                    metadata=data["data"].get("metadata", {}),
                    customer={
                        "email": data["data"]["customer"]["email"],
                        "name": data["data"]["customer"].get("first_name", "")
                        + " "
                        + data["data"]["customer"].get("last_name", ""),
                        "phone": data["data"]["customer"].get("phone", ""),
                    },
                    payment_method=self._map_payment_method(
                        data["data"].get("channel")
                    ),
                    fees=TransactionFee(
                        percentage=1.5,  # Default Paystack percentage
                        calculated_fee=Money(value=fee_value, currency=currency),
                    ),
                )
            else:
                logger.error(f"Paystack verification failed: {data}")
                return PaymentVerificationResponse(
                    success=False,
                    reference=reference,
                    amount=Money(value=0, currency="NGN"),
                    provider=PaymentProvider.PAYSTACK,
                    transaction_date=data["data"].get("paid_at", ""),
                )

        except requests.RequestException as e:
            logger.error(f"Error verifying Paystack payment: {str(e)}")
            raise Exception(f"Payment verification failed: {str(e)}")

    def validate_webhook(self, payload: bytes, signature: str) -> bool:
        """Validate Paystack webhook signature"""
        try:
            hash_value = hmac.new(
                self.secret_key.encode("utf-8"), payload, digestmod=hashlib.sha512
            ).hexdigest()

            return hash_value == signature
        except Exception as e:
            logger.error(f"Error validating Paystack webhook: {str(e)}")
            return False

    def _map_payment_method(self, channel: str) -> Optional[PaymentMethod]:
        """Map Paystack payment channel to our PaymentMethod enum"""
        mapping = {
            "card": PaymentMethod.CARD,
            "bank": PaymentMethod.BANK_TRANSFER,
            "ussd": PaymentMethod.USSD,
            "mobile_money": PaymentMethod.MOBILE_MONEY,
        }
        return mapping.get(channel.lower()) if channel else None


class FlutterwaveProvider(PaymentProviderInterface):
    """Flutterwave payment provider implementation"""

    def __init__(
        self, secret_key: str, public_key: str, encryption_key: Optional[str] = None
    ):
        self.secret_key = secret_key
        self.public_key = public_key
        self.encryption_key = encryption_key
        self.base_url = "https://api.flutterwave.com/v3"

    def initialize_payment(
        self, request: PaymentInitializeRequest
    ) -> PaymentInitializeResponse:
        """Initialize a payment with Flutterwave"""
        try:
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
            }

            tx_ref = f"order_{request.order_id}_{request.provider}"

            payload = {
                "tx_ref": tx_ref,
                "amount": request.amount.value,
                "currency": request.amount.currency,
                "redirect_url": request.redirect_url,
                "customer": {
                    "email": request.customer_email,
                    "name": request.customer_name,
                    "phonenumber": request.customer_phone,
                },
                "meta": {"order_id": request.order_id, **request.metadata},
            }

            response = requests.post(
                f"{self.base_url}/payments", headers=headers, json=payload
            )

            response.raise_for_status()
            data = response.json()

            if data["status"] == "success":
                return PaymentInitializeResponse(
                    checkout_url=data["data"]["link"],
                    reference=tx_ref,
                    payment_link=data["data"]["link"],
                )
            else:
                logger.error(f"Flutterwave initialization failed: {data}")
                raise Exception(data["message"])

        except requests.RequestException as e:
            logger.error(f"Error initializing Flutterwave payment: {str(e)}")
            raise Exception(f"Payment initialization failed: {str(e)}")

    def verify_payment(self, reference: str) -> PaymentVerificationResponse:
        """Verify payment with Flutterwave"""
        try:
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
            }

            # First try to find by tx_ref
            response = requests.get(
                f"{self.base_url}/transactions?tx_ref={reference}", headers=headers
            )

            response.raise_for_status()
            data = response.json()

            if data["status"] == "success" and data["data"] and len(data["data"]) > 0:
                transaction = data["data"][0]

                # Verify the status is successful
                if transaction["status"] == "successful":
                    amount_value = float(transaction["amount"])
                    currency = transaction["currency"]

                    # Extract fees if available
                    fee_value = float(transaction.get("app_fee", 0))

                    return PaymentVerificationResponse(
                        success=True,
                        reference=reference,
                        amount=Money(value=amount_value, currency=currency),
                        provider=PaymentProvider.FLUTTERWAVE,
                        provider_reference=str(transaction.get("id")),
                        transaction_date=transaction.get("created_at", ""),
                        metadata=transaction.get("meta", {}),
                        customer={
                            "email": transaction.get("customer", {}).get("email", ""),
                            "name": transaction.get("customer", {}).get("name", ""),
                            "phone": transaction.get("customer", {}).get(
                                "phone_number", ""
                            ),
                        },
                        payment_method=self._map_payment_method(
                            transaction.get("payment_type")
                        ),
                        fees=TransactionFee(
                            percentage=1.4,  # Default Flutterwave percentage
                            calculated_fee=Money(value=fee_value, currency=currency),
                        ),
                    )
                else:
                    logger.error(
                        f"Flutterwave transaction not successful: {transaction}"
                    )
                    return PaymentVerificationResponse(
                        success=False,
                        reference=reference,
                        amount=Money(
                            value=float(transaction.get("amount", 0)),
                            currency=transaction.get("currency", "NGN"),
                        ),
                        provider=PaymentProvider.FLUTTERWAVE,
                        transaction_date=transaction.get("created_at", ""),
                    )
            else:
                logger.error(f"Flutterwave verification failed: {data}")
                return PaymentVerificationResponse(
                    success=False,
                    reference=reference,
                    amount=Money(value=0, currency="NGN"),
                    provider=PaymentProvider.FLUTTERWAVE,
                    transaction_date="",
                )

        except requests.RequestException as e:
            logger.error(f"Error verifying Flutterwave payment: {str(e)}")
            raise Exception(f"Payment verification failed: {str(e)}")

    def validate_webhook(self, payload: bytes, signature: str) -> bool:
        """Validate Flutterwave webhook signature"""
        try:
            if not self.secret_key:
                return False

            # Flutterwave uses a different approach for webhook validation
            # They include a 'verificationHash' in the payload that should be compared
            # with a hash generated using the secret key
            payload_dict = json.loads(payload)
            verification_hash = payload_dict.get("verificationHash")

            if not verification_hash:
                return False

            # The format can vary, but typically it's a combination of the secret key and certain payload fields
            # This is a simplified implementation
            # In practice, concatenate with relevant fields
            data_to_hash = f"{self.secret_key}"
            computed_hash = hashlib.sha256(data_to_hash.encode()).hexdigest()

            return computed_hash == verification_hash

        except Exception as e:
            logger.error(f"Error validating Flutterwave webhook: {str(e)}")
            return False

    def _map_payment_method(self, payment_type: str) -> Optional[PaymentMethod]:
        """Map Flutterwave payment type to our PaymentMethod enum"""
        mapping = {
            "card": PaymentMethod.CARD,
            "banktransfer": PaymentMethod.BANK_TRANSFER,
            "ussd": PaymentMethod.USSD,
            "mobilemoney": PaymentMethod.MOBILE_MONEY,
            "account": PaymentMethod.BANK_TRANSFER,
        }
        return mapping.get(payment_type.lower()) if payment_type else None


class MpesaProvider(PaymentProviderInterface):
    """M-Pesa (Daraja) payment provider implementation"""

    def __init__(
        self, consumer_key: str, consumer_secret: str, shortcode: str, passkey: str
    ):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.shortcode = shortcode
        self.passkey = passkey
        self.base_url = "https://sandbox.safaricom.co.ke"
        self.token = None

    def _get_access_token(self):
        if self.token:
            return self.token
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        response = requests.get(url, auth=(self.consumer_key, self.consumer_secret))
        response.raise_for_status()
        self.token = response.json()["access_token"]
        return self.token

    def initialize_payment(
        self, request: PaymentInitializeRequest
    ) -> PaymentInitializeResponse:
        """Initiate M-Pesa STK Push or USSD fallback"""
        try:
            access_token = self._get_access_token()
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }
            # STK Push
            payload = {
                "BusinessShortCode": self.shortcode,
                "Password": self._generate_password(),
                "Timestamp": self._get_timestamp(),
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(request.amount.value),
                "PartyA": request.customer_phone,
                "PartyB": self.shortcode,
                "PhoneNumber": request.customer_phone,
                "CallBackURL": request.redirect_url,
                "AccountReference": request.order_id,
                "TransactionDesc": request.metadata.get("desc", "Order Payment"),
            }
            url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            # USSD fallback (simulate, real USSD would be handled by frontend or SMS)
            ussd_code = f"*234*{self.shortcode}*{int(request.amount.value)}#"
            return PaymentInitializeResponse(
                checkout_url="",  # M-Pesa is mobile-based
                reference=data.get("CheckoutRequestID", ""),
                payment_link="",
                metadata={"ussd_code": ussd_code},
            )
        except Exception as e:
            logger.error(f"Error initializing M-Pesa payment: {str(e)}")
            raise Exception(f"M-Pesa payment initialization failed: {str(e)}")

    def verify_payment(self, reference: str) -> PaymentVerificationResponse:
        """Verify M-Pesa payment status (simulate for now)"""
        # In production, use Daraja API to query status
        # Here, simulate as always successful
        return PaymentVerificationResponse(
            success=True,
            reference=reference,
            amount=Money(value=0, currency="KES"),
            provider=PaymentProvider.MPESA,
            provider_reference=reference,
            transaction_date="",
            metadata={},
            customer={},
            payment_method=PaymentMethod.MOBILE_MONEY,
        )

    def validate_webhook(self, payload: bytes, signature: str) -> bool:
        # M-Pesa webhooks can be validated by IP or shared secret if available
        # For now, always return True (add real logic as needed)
        return True

    def _generate_password(self):
        import base64

        timestamp = self._get_timestamp()
        data = f"{self.shortcode}{self.passkey}{timestamp}"
        return base64.b64encode(data.encode()).decode()

    def _get_timestamp(self):
        from datetime import datetime

        return datetime.utcnow().strftime("%Y%m%d%H%M%S")


class StripeProvider(PaymentProviderInterface):
    """Stripe payment provider implementation"""

    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.base_url = "https://api.stripe.com/v1"

    def initialize_payment(
        self, request: PaymentInitializeRequest
    ) -> PaymentInitializeResponse:
        import requests

        try:
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            }
            data = {
                "amount": int(request.amount.value * 100),
                "currency": request.amount.currency.lower(),
                "payment_method_types[]": "card",
                "metadata[order_id]": request.order_id,
                "receipt_email": request.customer_email,
            }
            response = requests.post(
                f"{self.base_url}/payment_intents", headers=headers, data=data
            )
            response.raise_for_status()
            resp_data = response.json()
            return PaymentInitializeResponse(
                checkout_url="",  # Stripe uses client-side SDK for checkout
                reference=resp_data["id"],
                payment_link="",
                metadata={"client_secret": resp_data.get("client_secret", "")},
            )
        except Exception as e:
            logger.error(f"Error initializing Stripe payment: {str(e)}")
            raise Exception(f"Stripe payment initialization failed: {str(e)}")

    def verify_payment(self, reference: str) -> PaymentVerificationResponse:
        import requests

        try:
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            }
            response = requests.get(
                f"{self.base_url}/payment_intents/{reference}", headers=headers
            )
            response.raise_for_status()
            data = response.json()
            status = data["status"]
            amount_value = float(data["amount"]) / 100
            currency = data["currency"].upper()
            return PaymentVerificationResponse(
                success=status == "succeeded",
                reference=reference,
                amount=Money(value=amount_value, currency=currency),
                provider=PaymentProvider.STRIPE,
                provider_reference=reference,
                transaction_date=data.get("created", ""),
                metadata=data.get("metadata", {}),
                customer={"email": data.get("receipt_email", "")},
                payment_method=PaymentMethod.CARD,
            )
        except Exception as e:
            logger.error(f"Error verifying Stripe payment: {str(e)}")
            raise Exception(f"Stripe payment verification failed: {str(e)}")

    def validate_webhook(self, payload: bytes, signature: str) -> bool:
        import hashlib
        import hmac
        import os

        endpoint_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        try:
            # Stripe signs the payload with a secret
            # In production, use stripe's official library for signature verification
            return True  # For now, always return True
        except Exception as e:
            logger.error(f"Error validating Stripe webhook: {str(e)}")
            return False


def get_payment_provider(
    provider: PaymentProvider, credentials: Dict[str, str]
) -> PaymentProviderInterface:
    """Factory function to get the appropriate payment provider instance"""
    if provider == PaymentProvider.PAYSTACK:
        return PaystackProvider(
            secret_key=credentials.get("secret_key", ""),
            public_key=credentials.get("public_key", ""),
        )
    elif provider == PaymentProvider.FLUTTERWAVE:
        return FlutterwaveProvider(
            secret_key=credentials.get("secret_key", ""),
            public_key=credentials.get("public_key", ""),
            encryption_key=credentials.get("encryption_key"),
        )
    elif provider == PaymentProvider.MPESA:
        return MpesaProvider(
            consumer_key=credentials.get("consumer_key", ""),
            consumer_secret=credentials.get("consumer_secret", ""),
            shortcode=credentials.get("shortcode", ""),
            passkey=credentials.get("passkey", ""),
        )
    elif provider == PaymentProvider.STRIPE:
        return StripeProvider(secret_key=credentials.get("secret_key", ""))
    else:
        raise ValueError(f"Unsupported payment provider: {provider}")
