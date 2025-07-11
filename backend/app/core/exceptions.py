class AppError(Exception):
    """Base exception for all application errors."""
    pass


class ProductError(AppError):
    """Base exception for product-related errors"""
    # Extend with context attributes as needed


class ProductNotFoundError(ProductError):
    """Raised when a product is not found"""
    # Extend with context attributes as needed


class ProductPermissionError(ProductError):
    """Raised when a user doesn't have permission to perform an action on a product"""
    # Extend with context attributes as needed


class ProductValidationError(ProductError):
    """Raised when product data validation fails"""
    # Extend with context attributes as needed


class DatabaseError(AppError):
    """Raised when a database operation fails"""
    # Extend with context attributes as needed


class AuthenticationError(AppError):
    """Raised when authentication fails"""
    # Extend with context attributes as needed


class AuthorizationError(AppError):
    """Raised when authorization fails"""
    # Extend with context attributes as needed


class PermissionDeniedError(AppError):
    """Raised when permission is denied for an operation"""
    # Extend with context attributes as needed


class InvalidContextError(AppError):
    """Raised when an operation is attempted in an invalid context"""
    # Extend with context attributes as needed


class ResourceNotFoundError(AppError):
    """Raised when a requested resource is not found"""
    # Extend with context attributes as needed


class ValidationError(AppError):
    """Raised when input validation fails"""
    # Extend with context attributes as needed


class BusinessLogicError(AppError):
    """Raised when a business logic rule is violated"""
    # Extend with context attributes as needed


class CacheError(AppError):
    """Raised when a cache operation fails"""
    # Extend with context attributes as needed


class RateLimitError(AppError):
    """Raised when rate limits are exceeded"""
    # Extend with context attributes as needed


class ConcurrentModificationError(AppError):
    """Raised when concurrent modifications to the same resource are detected"""
    # Extend with context attributes as needed
