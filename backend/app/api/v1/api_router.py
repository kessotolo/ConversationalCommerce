from app.api.v1.endpoints import (
    address_book,
    saved_payment_method,
    notification_preferences,
    buyer_orders,
)

api_router.include_router(
    address_book.router, prefix="/address-book", tags=["address-book"])
api_router.include_router(saved_payment_method.router,
                          prefix="/saved-payment-methods", tags=["saved-payment-methods"])
api_router.include_router(notification_preferences.router,
                          prefix="/notification-preferences", tags=["notification-preferences"])
api_router.include_router(buyer_orders.router, prefix="/buyer/orders", tags=["buyer-orders"])
