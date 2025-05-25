class ProductError(Exception):
    """Base exception for product-related errors"""
    pass


class ProductNotFoundError(ProductError):
    """Raised when a product is not found"""
    pass


class ProductPermissionError(ProductError):
    """Raised when a user doesn't have permission to perform an action on a product"""
    pass


class ProductValidationError(ProductError):
    """Raised when product data validation fails"""
    pass


class DatabaseError(Exception):
    """Raised when a database operation fails"""
    pass


class AuthenticationError(Exception):
    """Raised when authentication fails"""
    pass


class AuthorizationError(Exception):
    """Raised when authorization fails"""
    pass


class ResourceNotFoundError(Exception):
    """Raised when a requested resource is not found"""
    pass


class ValidationError(Exception):
    """Raised when input validation fails"""
    pass


class BusinessLogicError(Exception):
    """Raised when a business logic rule is violated"""
    pass
