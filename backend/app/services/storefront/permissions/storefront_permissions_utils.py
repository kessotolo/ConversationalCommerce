"""
Storefront Permissions Utilities

This module contains utility functions for permission management,
including audit logging and other shared functionality.
"""

import uuid
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from app.app.services.audit_service import create_audit_log


async def log_permission_change(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    performed_by: uuid.UUID,
    action: str,
    details: Dict[str, Any],
) -> None:
    """
    Log permission changes to the audit log.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user whose permissions changed
        performed_by: UUID of the user who performed the change
        action: Type of change performed
        details: Additional details about the change
    """
    # Prepare audit log entry
    log_data = {
        "tenant_id": str(tenant_id),
        "action": f"storefront_permission_{action}",
        "entity_type": "user",
        "entity_id": str(user_id),
        "user_id": str(performed_by),
        "metadata": {
            **details,
            "target_user_id": str(user_id),
        },
    }

    # Create audit log
    await create_audit_log(db=db, **log_data)
