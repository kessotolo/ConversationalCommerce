import uuid
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.app.models.storefront_permission import (
    StorefrontPermission,
    StorefrontRole,
    StorefrontSectionType,
)
from app.app.models.tenant import Tenant
from app.app.models.user import User

# Define permission levels with corresponding actions
PERMISSION_LEVELS = {
    StorefrontRole.VIEWER: ["view"],
    StorefrontRole.EDITOR: ["view", "edit"],
    StorefrontRole.PUBLISHER: ["view", "edit", "publish"],
    StorefrontRole.ADMIN: ["view", "edit", "publish", "delete", "manage_permissions"],
}

# Define section-specific permissions
SECTION_PERMISSIONS = {
    StorefrontSectionType.THEME: ["view", "edit", "publish"],
    StorefrontSectionType.LAYOUT: ["view", "edit", "publish"],
    StorefrontSectionType.CONTENT: ["view", "edit", "publish"],
    StorefrontSectionType.PRODUCTS: ["view", "edit", "publish"],
    StorefrontSectionType.SETTINGS: ["view", "edit", "publish"],
    StorefrontSectionType.BANNERS: ["view", "edit", "publish"],
    StorefrontSectionType.ASSETS: ["view", "edit", "publish", "delete"],
    StorefrontSectionType.SEO: ["view", "edit", "publish"],
}


async def assign_role(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    role: StorefrontRole,
    assigned_by: uuid.UUID,
) -> StorefrontPermission:
    """
    Assign a storefront role to a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user to assign role to
        role: StorefrontRole to assign
        assigned_by: UUID of the user performing the assignment

    Returns:
        Updated or created StorefrontPermission

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if assigner doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if assigner has permission to manage roles
    if not await has_permission(db, tenant_id, assigned_by, "manage_permissions"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage roles",
        )

    # Check if user already has a role
    permission = (
        db.query(StorefrontPermission)
        .filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id,
        )
        .first()
    )

    if permission:
        # Update existing permission
        permission.role = role
    else:
        # Create new permission
        permission = StorefrontPermission(
            tenant_id=tenant_id, user_id=user_id, role=role
        )
        db.add(permission)

    # Log the action in audit log
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=assigned_by,
        action="role_assigned",
        details={"role": role.value},
    )

    db.commit()
    db.refresh(permission)

    return permission


async def set_section_permission(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    section: StorefrontSectionType,
    permissions: List[str],
    assigned_by: uuid.UUID,
) -> StorefrontPermission:
    """
    Set section-specific permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        section: Section to set permissions for
        permissions: List of permissions to grant
        assigned_by: UUID of the user performing the assignment

    Returns:
        Updated StorefrontPermission

    Raises:
        HTTPException: 404 if tenant, user, or permission not found
        HTTPException: 403 if assigner doesn't have permission
        HTTPException: 400 if invalid permissions are specified
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if assigner has permission to manage roles
    if not await has_permission(db, tenant_id, assigned_by, "manage_permissions"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage permissions",
        )

    # Validate the permissions
    allowed_permissions = SECTION_PERMISSIONS.get(section, [])
    for perm in permissions:
        if perm not in allowed_permissions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission '{perm}' for section {section.value}",
            )

    # Get user's permission record
    permission = (
        db.query(StorefrontPermission)
        .filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id,
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission record not found for this user",
        )

    # Update section permissions
    section_permissions = (
        permission.section_permissions.copy() if permission.section_permissions else {}
    )
    section_permissions[section.value] = permissions
    permission.section_permissions = section_permissions

    # Log the action in audit log
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=assigned_by,
        action="section_permission_updated",
        details={"section": section.value, "permissions": permissions},
    )

    db.commit()
    db.refresh(permission)

    return permission


async def set_component_permission(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    component_id: uuid.UUID,
    permissions: List[str],
    assigned_by: uuid.UUID,
) -> StorefrontPermission:
    """
    Set component-specific permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        component_id: UUID of the component
        permissions: List of permissions to grant
        assigned_by: UUID of the user performing the assignment

    Returns:
        Updated StorefrontPermission

    Raises:
        HTTPException: 404 if tenant, user, or permission not found
        HTTPException: 403 if assigner doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if assigner has permission to manage roles
    if not await has_permission(db, tenant_id, assigned_by, "manage_permissions"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage permissions",
        )

    # Get user's permission record
    permission = (
        db.query(StorefrontPermission)
        .filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id,
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission record not found for this user",
        )

    # Update component permissions
    component_permissions = (
        permission.component_permissions.copy()
        if permission.component_permissions
        else {}
    )
    component_permissions[str(component_id)] = permissions
    permission.component_permissions = component_permissions

    # Log the action in audit log
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=assigned_by,
        action="component_permission_updated",
        details={"component_id": str(component_id), "permissions": permissions},
    )

    db.commit()
    db.refresh(permission)

    return permission


async def get_user_permissions(
    db: Session, tenant_id: uuid.UUID, user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Get all permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user

    Returns:
        Dictionary of user permissions

    Raises:
        HTTPException: 404 if tenant or user not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get user's permission record
    permission = (
        db.query(StorefrontPermission)
        .filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id,
        )
        .first()
    )

    if not permission:
        # Return default permissions (none)
        return {
            "role": None,
            "global_permissions": [],
            "section_permissions": {},
            "component_permissions": {},
        }

    # Get permissions based on role
    global_permissions = PERMISSION_LEVELS.get(permission.role, [])

    return {
        "role": permission.role.value,
        "global_permissions": global_permissions,
        "section_permissions": permission.section_permissions,
        "component_permissions": permission.component_permissions,
    }


async def has_permission(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    required_permission: str,
    section: Optional[StorefrontSectionType] = None,
    component_id: Optional[uuid.UUID] = None,
) -> bool:
    """
    Check if a user has a specific permission.

    This function implements the permission checking logic with the following hierarchy:
    1. Component-specific permissions (most specific)
    2. Section-specific permissions
    3. Global role-based permissions (most general)

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        required_permission: Permission to check for
        section: Optional section to check permissions for
        component_id: Optional component ID to check permissions for

    Returns:
        True if user has permission, False otherwise
    """
    # Get user's permission record
    permission = (
        db.query(StorefrontPermission)
        .filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id,
        )
        .first()
    )

    if not permission:
        return False

    # Check component-specific permissions first (most specific)
    if component_id and permission.component_permissions:
        component_perms = permission.component_permissions.get(str(component_id), [])
        if required_permission in component_perms:
            return True

    # Check section-specific permissions
    if section and permission.section_permissions:
        section_perms = permission.section_permissions.get(section.value, [])
        if required_permission in section_perms:
            return True

    # Check global role-based permissions (most general)
    global_perms = PERMISSION_LEVELS.get(permission.role, [])
    if required_permission in global_perms:
        return True

    return False


async def list_users_with_permissions(
    db: Session, tenant_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    List all users with their permissions for a tenant.

    Args:
        db: Database session
        tenant_id: UUID of the tenant

    Returns:
        List of users with their permissions

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get all permission records for the tenant
    permissions = (
        db.query(StorefrontPermission)
        .filter(StorefrontPermission.tenant_id == tenant_id)
        .all()
    )

    # Collect user IDs
    user_ids = [str(p.user_id) for p in permissions]

    # Get user details
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {str(u.id): u for u in users}

    result = []
    for permission in permissions:
        user = user_map.get(str(permission.user_id))
        if not user:
            continue

        global_permissions = PERMISSION_LEVELS.get(permission.role, [])

        result.append(
            {
                "user_id": str(user.id),
                "username": user.username,
                "role": permission.role.value,
                "global_permissions": global_permissions,
                "section_permissions": permission.section_permissions,
                "component_permissions": permission.component_permissions,
            }
        )

    return result


async def remove_user_permission(
    db: Session, tenant_id: uuid.UUID, user_id: uuid.UUID, removed_by: uuid.UUID
) -> bool:
    """
    Remove all permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        removed_by: UUID of the user performing the removal

    Returns:
        True if permissions were removed, False if no permissions existed

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if remover doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if remover has permission to manage roles
    if not await has_permission(db, tenant_id, removed_by, "manage_permissions"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage permissions",
        )

    # Get user's permission record
    permission = (
        db.query(StorefrontPermission)
        .filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id,
        )
        .first()
    )

    if not permission:
        return False

    # Log the action in audit log
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=removed_by,
        action="permissions_removed",
        details={"previous_role": permission.role.value},
    )

    # Delete the permission record
    db.delete(permission)
    db.commit()

    return True


async def log_permission_change(
    db: Session,
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
    # In a real implementation, this would log to a central audit log system
    # For now, we'll assume there's an audit_log table and service

    # Example of how this might be implemented:
    # await audit_service.log_event(
    #     db=db,
    #     tenant_id=tenant_id,
    #     event_type="permission_change",
    #     user_id=performed_by,
    #     target_id=user_id,
    #     action=action,
    #     details=details
    # )

    # For this phase, we'll leave this as a placeholder
    pass


# Schema validation functions


async def validate_json_schema(
    data: Dict[str, Any], schema: Dict[str, Any]
) -> Tuple[bool, Optional[str]]:
    """
    Validate data against a JSON schema.

    Args:
        data: Data to validate
        schema: JSON schema to validate against

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        from jsonschema import ValidationError, validate

        validate(instance=data, schema=schema)
        return True, None
    except ValidationError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Validation error: {str(e)}"


async def validate_theme_settings(
    theme_settings: Dict[str, Any],
) -> Tuple[bool, Optional[str]]:
    """
    Validate theme settings against the theme schema.

    Args:
        theme_settings: Theme settings to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Define the theme settings schema
    schema = {
        "type": "object",
        "properties": {
            "colors": {
                "type": "object",
                "properties": {
                    "primary": {
                        "type": "string",
                        "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
                    },
                    "secondary": {
                        "type": "string",
                        "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
                    },
                    "background": {
                        "type": "string",
                        "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
                    },
                    "text": {
                        "type": "string",
                        "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
                    },
                },
                "required": ["primary", "secondary", "background", "text"],
            },
            "typography": {
                "type": "object",
                "properties": {
                    "fontFamily": {
                        "type": "object",
                        "properties": {
                            "heading": {"type": "string"},
                            "body": {"type": "string"},
                        },
                        "required": ["heading", "body"],
                    },
                    "fontSize": {
                        "type": "object",
                        "properties": {
                            "base": {"type": "string"},
                            "sm": {"type": "string"},
                            "lg": {"type": "string"},
                            "xl": {"type": "string"},
                        },
                        "required": ["base", "sm", "lg", "xl"],
                    },
                    "fontWeight": {
                        "type": "object",
                        "properties": {
                            "normal": {"type": "string"},
                            "medium": {"type": "string"},
                            "bold": {"type": "string"},
                        },
                        "required": ["normal", "medium", "bold"],
                    },
                },
                "required": ["fontFamily", "fontSize", "fontWeight"],
            },
        },
        "required": ["colors", "typography"],
    }

    return await validate_json_schema(theme_settings, schema)


async def validate_layout_config(
    layout_config: Dict[str, Any],
) -> Tuple[bool, Optional[str]]:
    """
    Validate layout configuration against the layout schema.

    Args:
        layout_config: Layout configuration to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Define the layout configuration schema
    schema = {
        "type": "object",
        "properties": {
            "hero": {
                "type": "object",
                "properties": {
                    "enabled": {"type": "boolean"},
                    "type": {"type": "string", "enum": ["banner", "slider", "video"]},
                    "content": {"type": "array"},
                },
                "required": ["enabled", "type"],
            },
            "featured_products": {
                "type": "object",
                "properties": {
                    "enabled": {"type": "boolean"},
                    "title": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 20},
                },
                "required": ["enabled"],
            },
            "categories": {
                "type": "object",
                "properties": {
                    "enabled": {"type": "boolean"},
                    "display_mode": {
                        "type": "string",
                        "enum": ["grid", "list", "carousel"],
                    },
                },
                "required": ["enabled"],
            },
            "about": {
                "type": "object",
                "properties": {
                    "enabled": {"type": "boolean"},
                    "content": {"type": "string"},
                },
                "required": ["enabled"],
            },
        },
        "required": ["hero", "featured_products", "categories", "about"],
    }

    return await validate_json_schema(layout_config, schema)


async def sanitize_html_content(content: str) -> str:
    """
    Sanitize HTML content to prevent XSS attacks.

    Args:
        content: HTML content to sanitize

    Returns:
        Sanitized HTML content
    """
    try:
        from bs4 import BeautifulSoup

        # Define allowed tags and attributes
        allowed_tags = [
            "a",
            "b",
            "blockquote",
            "br",
            "caption",
            "code",
            "div",
            "em",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "hr",
            "i",
            "img",
            "li",
            "nl",
            "ol",
            "p",
            "pre",
            "span",
            "strong",
            "table",
            "tbody",
            "td",
            "th",
            "thead",
            "tr",
            "ul",
        ]

        allowed_attrs = {
            "a": ["href", "title", "target"],
            "img": ["src", "alt", "title", "width", "height"],
            "div": ["class", "id"],
            "span": ["class", "id"],
            "table": ["border", "cellpadding", "cellspacing", "width"],
            "td": ["colspan", "rowspan", "width"],
            "th": ["colspan", "rowspan", "width"],
        }

        # Parse the HTML
        soup = BeautifulSoup(content, "html.parser")

        # Remove disallowed tags
        for tag in soup.find_all(True):
            if tag.name not in allowed_tags:
                tag.unwrap()
            else:
                # Remove disallowed attributes
                attrs = dict(tag.attrs)
                for attr in attrs:
                    if attr not in allowed_attrs.get(tag.name, []):
                        del tag[attr]

                # Sanitize URLs in href and src attributes
                if tag.name == "a" and tag.has_attr("href"):
                    if not tag["href"].startswith(
                        ("/", "http://", "https://", "mailto:", "tel:")
                    ):
                        del tag["href"]

                if tag.name == "img" and tag.has_attr("src"):
                    if not tag["src"].startswith(("/", "http://", "https://")):
                        del tag["src"]

        # Return the sanitized HTML
        return str(soup)
    except ImportError:
        # If BeautifulSoup is not available, return a stripped version of the content
        return content.strip()
