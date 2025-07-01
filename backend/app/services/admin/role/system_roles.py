"""
System roles creation and management.

This module handles the creation and management of default system roles.
"""

from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin.role import Role
from app.core.errors.exception import DuplicateEntityError
from app.services.admin.role.crud import create_role, get_role_by_name
from app.services.admin.role.hierarchy import add_role_parent


async def create_system_roles(
    db: AsyncSession
) -> Dict[str, Role]:
    """
    Create the default set of system roles.
    
    This function should be called during system initialization to ensure
    all necessary roles exist and have the appropriate hierarchy.
    
    Args:
        db: Database session
        
    Returns:
        Dictionary mapping role keys to role objects
    """
    # Define core system roles
    system_roles = {
        "super_admin": {
            "name": "Super Admin",
            "description": "Full access to all resources across all tenants",
            "is_system": True,
            "is_tenant_scoped": False
        },
        "domain_admin": {
            "name": "Domain Admin",
            "description": "Administrative access within specific domains/tenants",
            "is_system": True,
            "is_tenant_scoped": True
        },
        "support_admin": {
            "name": "Support Admin",
            "description": "Limited administrative access for support tasks",
            "is_system": True,
            "is_tenant_scoped": False
        },
        "read_only_admin": {
            "name": "Read Only Admin",
            "description": "Read-only access to administrative resources",
            "is_system": True,
            "is_tenant_scoped": False
        }
    }
    
    # Create roles or get existing ones
    created_roles = {}
    for role_key, role_data in system_roles.items():
        try:
            role = await create_role(
                db=db,
                name=role_data["name"],
                description=role_data["description"],
                is_system=role_data["is_system"],
                is_tenant_scoped=role_data["is_tenant_scoped"]
            )
            created_roles[role_key] = role
        except DuplicateEntityError:
            # If role already exists, get it instead
            role = await get_role_by_name(db, role_data["name"])
            if role:
                created_roles[role_key] = role
    
    # Set up role hierarchy
    await _setup_role_hierarchy(db, created_roles)
                
    return created_roles


async def _setup_role_hierarchy(
    db: AsyncSession,
    roles: Dict[str, Role]
) -> None:
    """
    Set up the default role hierarchy.
    
    Args:
        db: Database session
        roles: Dictionary of created roles
    """
    # Super Admin > Domain Admin > Support Admin > Read Only Admin
    hierarchy = [
        ("super_admin", "domain_admin"),
        ("domain_admin", "support_admin"),
        ("support_admin", "read_only_admin")
    ]
    
    for parent_key, child_key in hierarchy:
        if parent_key in roles and child_key in roles:
            parent_role = roles[parent_key]
            child_role = roles[child_key]
            try:
                await add_role_parent(
                    db=db,
                    child_role_id=child_role.id,
                    parent_role_id=parent_role.id
                )
            except (DuplicateEntityError, ValueError):
                # Skip if hierarchy already exists or would create circular dependency
                pass
