"""
Default role definitions for the Super Admin RBAC system.

This module defines and initializes default system roles.
"""

from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.admin.role import Role
from app.app.services.admin.role.service import RoleService


async def initialize_default_roles(
    db: AsyncSession,
    role_service: Optional[RoleService] = None
) -> Dict[str, Role]:
    """
    Initialize default system roles.
    
    Args:
        db: Database session
        role_service: Optional role service instance
        
    Returns:
        Dictionary of created roles by key
    """
    service = role_service or RoleService()
    
    # Create system roles using the service
    system_roles = await service.create_system_roles(db)
    
    # Define additional roles
    additional_roles = {
        "content_manager": {
            "name": "Content Manager",
            "description": "Manages content within tenants",
            "is_system": True,
            "is_tenant_scoped": True
        },
        "user_manager": {
            "name": "User Manager",
            "description": "Manages user data within tenants",
            "is_system": True,
            "is_tenant_scoped": True
        },
        "analytics_viewer": {
            "name": "Analytics Viewer",
            "description": "Views analytics and reports",
            "is_system": True,
            "is_tenant_scoped": True
        },
        "security_admin": {
            "name": "Security Admin",
            "description": "Manages security settings and audit logs",
            "is_system": True,
            "is_tenant_scoped": False
        }
    }
    
    # Create additional roles
    for role_key, role_data in additional_roles.items():
        try:
            # Check if role already exists
            existing = await service.get_role_by_name(db, role_data["name"])
            if existing:
                system_roles[role_key] = existing
            else:
                # Create role if it doesn't exist
                role = await service.create_role(
                    db=db,
                    name=role_data["name"],
                    description=role_data["description"],
                    is_system=role_data["is_system"],
                    is_tenant_scoped=role_data["is_tenant_scoped"]
                )
                system_roles[role_key] = role
        except Exception as e:
            print(f"Error creating role {role_key}: {str(e)}")
    
    # Create role hierarchy
    await _setup_additional_role_hierarchy(db, system_roles, service)
    
    return system_roles


async def _setup_additional_role_hierarchy(
    db: AsyncSession,
    roles: Dict[str, Role],
    role_service: RoleService
) -> None:
    """
    Set up additional role hierarchy beyond what's created by default.
    
    Args:
        db: Database session
        roles: Dictionary of roles by key
        role_service: Role service instance
    """
    # Define additional hierarchy beyond the core hierarchy
    # Format: (parent_key, child_key)
    additional_hierarchy = [
        ("domain_admin", "content_manager"),
        ("domain_admin", "user_manager"),
        ("domain_admin", "analytics_viewer"),
        ("support_admin", "analytics_viewer"),
        ("super_admin", "security_admin")
    ]
    
    # Create hierarchy relationships
    for parent_key, child_key in additional_hierarchy:
        if parent_key in roles and child_key in roles:
            parent_role = roles[parent_key]
            child_role = roles[child_key]
            try:
                await role_service.add_role_parent(
                    db=db,
                    child_role_id=child_role.id,
                    parent_role_id=parent_role.id
                )
            except Exception:
                # Skip if hierarchy already exists or would create circular dependency
                pass
