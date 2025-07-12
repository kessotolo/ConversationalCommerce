"""
User schemas for API responses.
"""

from typing import Optional
from pydantic import BaseModel


class UserHasTenantResponse(BaseModel):
    """
    Response schema for checking if a user has a tenant.
    """
    has_tenant: bool
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
