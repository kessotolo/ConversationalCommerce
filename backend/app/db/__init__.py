# Import Base from base_class for cleaner imports
from .base_class import Base

# Export get_db for dependency injection
from .session import get_db, get_tenant_id_from_request, set_tenant_id
