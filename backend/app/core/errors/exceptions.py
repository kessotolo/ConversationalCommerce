class EntityNotFoundException(Exception):
    """Raised when an entity is not found in the database."""
    pass


class DuplicateEntityException(Exception):
    """Raised when attempting to create a duplicate entity."""
    pass


class UnauthorizedException(Exception):
    """Raised when a user is not authorized to perform an action."""
    pass


class ValidationError(Exception):
    """Raised when data validation fails."""
    pass
