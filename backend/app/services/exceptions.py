from app.app.core.exceptions import AppError


class ComplaintNotFoundError(AppError):
    """Raised when a complaint is not found"""
    # Extend with context attributes as needed


class ComplaintPermissionError(AppError):
    """Raised when a user doesn't have permission to perform an action on a complaint"""
    # Extend with context attributes as needed


class ComplaintValidationError(AppError):
    """Raised when complaint data validation fails"""
    # Extend with context attributes as needed


class DatabaseError(AppError):
    """Raised when a database operation fails"""
    # Extend with context attributes as needed
