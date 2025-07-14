from app.app.core.exceptions import AppError


class OrderError(AppError):
    """Base exception for order-related errors"""
    # Extend with context attributes as needed


class OrderNotFoundError(OrderError):
    """Raised when an order is not found"""
    # Extend with context attributes as needed


class OrderValidationError(OrderError):
    """Raised when order validation fails"""
    # Extend with context attributes as needed
