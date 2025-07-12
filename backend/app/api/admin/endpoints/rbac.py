"""
RBAC Management API endpoints for the unified super admin dashboard.
Comprehensive role-based access control with permissions, audit logging, and inheritance.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func, desc, and_, or_
from sqlalchemy.orm import selectinload

from backend.app.core.security.dependencies import get_current_super_admin
from backend.app.models.admin.admin_user import AdminUser
from backend.app.db.async_session import get_async_db
from backend.app.models.audit.audit_log import AuditLog
from backend.app.schemas.admin.dashboard import (
    Permission,
    Role,
    UserRole,
    RoleCreateRequest,
    RoleUpdateRequest,
    UserRoleAssignRequest,
    PermissionAuditLog,
    GlobalSearchResult
)

router = APIRouter(prefix="/rbac", tags=["rbac"])

# Permission Management


@router.get("/permissions", response_model=List[Permission])
async def get_all_permissions(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    resource: Optional[str] = Query(None, description="Filter by resource"),
    scope: Optional[str] = Query(None, description="Filter by scope")
):
    """
    Get all available permissions in the system.
    """
    # In a real implementation, permissions would be stored in the database
    # For now, we'll return a hardcoded list of system permissions
    permissions = [
        # Global Admin Permissions
        Permission(
            id="global_admin_read",
            name="Global Admin Read",
            description="Read access to all global admin features",
            resource="global",
            action="read",
            scope="global"
        ),
        Permission(
            id="global_admin_write",
            name="Global Admin Write",
            description="Write access to all global admin features",
            resource="global",
            action="write",
            scope="global"
        ),
        Permission(
            id="global_admin_delete",
            name="Global Admin Delete",
            description="Delete access to global admin features",
            resource="global",
            action="delete",
            scope="global"
        ),

        # Tenant Management Permissions
        Permission(
            id="tenant_read",
            name="Tenant Read",
            description="Read access to tenant information",
            resource="tenant",
            action="read",
            scope="tenant"
        ),
        Permission(
            id="tenant_write",
            name="Tenant Write",
            description="Write access to tenant information",
            resource="tenant",
            action="write",
            scope="tenant"
        ),
        Permission(
            id="tenant_create",
            name="Tenant Create",
            description="Create new tenants",
            resource="tenant",
            action="create",
            scope="global"
        ),
        Permission(
            id="tenant_delete",
            name="Tenant Delete",
            description="Delete tenants",
            resource="tenant",
            action="delete",
            scope="global"
        ),

        # User Management Permissions
        Permission(
            id="user_read",
            name="User Read",
            description="Read access to user information",
            resource="user",
            action="read",
            scope="tenant"
        ),
        Permission(
            id="user_write",
            name="User Write",
            description="Write access to user information",
            resource="user",
            action="write",
            scope="tenant"
        ),
        Permission(
            id="user_create",
            name="User Create",
            description="Create new users",
            resource="user",
            action="create",
            scope="tenant"
        ),
        Permission(
            id="user_delete",
            name="User Delete",
            description="Delete users",
            resource="user",
            action="delete",
            scope="tenant"
        ),

        # Order Management Permissions
        Permission(
            id="order_read",
            name="Order Read",
            description="Read access to orders",
            resource="order",
            action="read",
            scope="tenant"
        ),
        Permission(
            id="order_write",
            name="Order Write",
            description="Write access to orders",
            resource="order",
            action="write",
            scope="tenant"
        ),
        Permission(
            id="order_create",
            name="Order Create",
            description="Create new orders",
            resource="order",
            action="create",
            scope="tenant"
        ),
        Permission(
            id="order_delete",
            name="Order Delete",
            description="Delete orders",
            resource="order",
            action="delete",
            scope="tenant"
        ),

        # Product Management Permissions
        Permission(
            id="product_read",
            name="Product Read",
            description="Read access to products",
            resource="product",
            action="read",
            scope="tenant"
        ),
        Permission(
            id="product_write",
            name="Product Write",
            description="Write access to products",
            resource="product",
            action="write",
            scope="tenant"
        ),
        Permission(
            id="product_create",
            name="Product Create",
            description="Create new products",
            resource="product",
            action="create",
            scope="tenant"
        ),
        Permission(
            id="product_delete",
            name="Product Delete",
            description="Delete products",
            resource="product",
            action="delete",
            scope="tenant"
        ),

        # Security Permissions
        Permission(
            id="security_read",
            name="Security Read",
            description="Read access to security features",
            resource="security",
            action="read",
            scope="global"
        ),
        Permission(
            id="security_write",
            name="Security Write",
            description="Write access to security features",
            resource="security",
            action="write",
            scope="global"
        ),
        Permission(
            id="emergency_lockdown",
            name="Emergency Lockdown",
            description="Trigger emergency lockdown",
            resource="security",
            action="emergency_lockdown",
            scope="global"
        ),

        # Analytics Permissions
        Permission(
            id="analytics_read",
            name="Analytics Read",
            description="Read access to analytics",
            resource="analytics",
            action="read",
            scope="tenant"
        ),
        Permission(
            id="analytics_global_read",
            name="Global Analytics Read",
            description="Read access to global analytics",
            resource="analytics",
            action="read",
            scope="global"
        ),

        # Audit Log Permissions
        Permission(
            id="audit_read",
            name="Audit Read",
            description="Read access to audit logs",
            resource="audit",
            action="read",
            scope="tenant"
        ),
        Permission(
            id="audit_global_read",
            name="Global Audit Read",
            description="Read access to global audit logs",
            resource="audit",
            action="read",
            scope="global"
        )
    ]

    # Apply filters
    if resource:
        permissions = [p for p in permissions if p.resource == resource]
    if scope:
        permissions = [p for p in permissions if p.scope == scope]

    return permissions

# Role Management


@router.get("/roles", response_model=List[Role])
async def get_all_roles(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    include_system_roles: bool = Query(
        True, description="Include system-defined roles")
):
    """
    Get all roles in the system.
    """
    # For demonstration, return predefined system roles
    # In production, these would be stored in the database

    all_permissions = await get_all_permissions(current_admin, db)
    permission_map = {p.id: p for p in all_permissions}

    roles = [
        Role(
            id="super_admin",
            name="Super Admin",
            description="Full system access with all permissions",
            permissions=all_permissions,
            is_system_role=True,
            created_at=datetime.utcnow() - timedelta(days=365),
            updated_at=datetime.utcnow() - timedelta(days=30)
        ),
        Role(
            id="global_admin",
            name="Global Admin",
            description="Global administrative access excluding security controls",
            permissions=[p for p in all_permissions if p.scope ==
                         "global" and p.resource != "security"],
            is_system_role=True,
            created_at=datetime.utcnow() - timedelta(days=365),
            updated_at=datetime.utcnow() - timedelta(days=30)
        ),
        Role(
            id="tenant_admin",
            name="Tenant Admin",
            description="Full administrative access within a tenant",
            permissions=[
                p for p in all_permissions if p.scope in ["tenant", "self"]],
            is_system_role=True,
            created_at=datetime.utcnow() - timedelta(days=365),
            updated_at=datetime.utcnow() - timedelta(days=30)
        ),
        Role(
            id="tenant_manager",
            name="Tenant Manager",
            description="Limited administrative access within a tenant",
            permissions=[p for p in all_permissions if p.scope in [
                "tenant", "self"] and p.action in ["read", "write"]],
            is_system_role=True,
            created_at=datetime.utcnow() - timedelta(days=365),
            updated_at=datetime.utcnow() - timedelta(days=30)
        ),
        Role(
            id="support_agent",
            name="Support Agent",
            description="Read-only access for customer support",
            permissions=[p for p in all_permissions if p.action == "read"],
            is_system_role=True,
            created_at=datetime.utcnow() - timedelta(days=365),
            updated_at=datetime.utcnow() - timedelta(days=30)
        ),
        Role(
            id="analytics_viewer",
            name="Analytics Viewer",
            description="Read-only access to analytics and reports",
            permissions=[p for p in all_permissions if p.resource in [
                "analytics", "audit"] and p.action == "read"],
            is_system_role=True,
            created_at=datetime.utcnow() - timedelta(days=365),
            updated_at=datetime.utcnow() - timedelta(days=30)
        )
    ]

    if not include_system_roles:
        roles = [r for r in roles if not r.is_system_role]

    return roles


@router.post("/roles", response_model=Role, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreateRequest,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new custom role.
    """
    # Validate permission IDs
    all_permissions = await get_all_permissions(current_admin, db)
    permission_map = {p.id: p for p in all_permissions}

    invalid_permissions = [
        pid for pid in role_data.permission_ids if pid not in permission_map]
    if invalid_permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permission IDs: {invalid_permissions}"
        )

    # Create role
    role_id = f"custom_{role_data.name.lower().replace(' ', '_')}"
    role_permissions = [permission_map[pid]
                        for pid in role_data.permission_ids]

    new_role = Role(
        id=role_id,
        name=role_data.name,
        description=role_data.description,
        permissions=role_permissions,
        is_system_role=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    # Log role creation
    await _log_rbac_action(
        db=db,
        action="role_created",
        actor_id=current_admin.id,
        details={
            "role_id": role_id,
            "role_name": role_data.name,
            "permission_count": len(role_data.permission_ids),
            "permissions": role_data.permission_ids
        }
    )

    return new_role


@router.get("/roles/{role_id}", response_model=Role)
async def get_role(
    role_id: str,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific role by ID.
    """
    roles = await get_all_roles(current_admin, db)
    role = next((r for r in roles if r.id == role_id), None)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    return role


@router.put("/roles/{role_id}", response_model=Role)
async def update_role(
    role_id: str,
    role_data: RoleUpdateRequest,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update an existing role.
    """
    # Get existing role
    existing_role = await get_role(role_id, current_admin, db)

    if existing_role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system-defined roles"
        )

    # Validate permission IDs if provided
    if role_data.permission_ids is not None:
        all_permissions = await get_all_permissions(current_admin, db)
        permission_map = {p.id: p for p in all_permissions}

        invalid_permissions = [
            pid for pid in role_data.permission_ids if pid not in permission_map]
        if invalid_permissions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission IDs: {invalid_permissions}"
            )

    # Update role
    updated_role = Role(
        id=existing_role.id,
        name=role_data.name or existing_role.name,
        description=role_data.description or existing_role.description,
        permissions=[permission_map[pid]
                     for pid in role_data.permission_ids] if role_data.permission_ids else existing_role.permissions,
        is_system_role=existing_role.is_system_role,
        created_at=existing_role.created_at,
        updated_at=datetime.utcnow()
    )

    # Log role update
    await _log_rbac_action(
        db=db,
        action="role_updated",
        actor_id=current_admin.id,
        details={
            "role_id": role_id,
            "changes": {
                "name": role_data.name,
                "description": role_data.description,
                "permission_ids": role_data.permission_ids
            }
        }
    )

    return updated_role


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: str,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a custom role.
    """
    role = await get_role(role_id, current_admin, db)

    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system-defined roles"
        )

    # Check if role is in use
    # In production, check user_roles table
    # For now, assume role can be deleted

    # Log role deletion
    await _log_rbac_action(
        db=db,
        action="role_deleted",
        actor_id=current_admin.id,
        details={
            "role_id": role_id,
            "role_name": role.name
        }
    )

# User Role Management


@router.get("/user-roles", response_model=List[UserRole])
async def get_user_roles(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    role_id: Optional[str] = Query(None, description="Filter by role ID"),
    scope: Optional[str] = Query(None, description="Filter by scope")
):
    """
    Get user role assignments.
    """
    # Mock data - in production, query user_roles table
    user_roles = [
        UserRole(
            user_id="user_1",
            role_id="super_admin",
            assigned_by=current_admin.id,
            assigned_at=datetime.utcnow() - timedelta(days=30),
            expires_at=None,
            scope="global",
            scope_id=None
        ),
        UserRole(
            user_id="user_2",
            role_id="tenant_admin",
            assigned_by=current_admin.id,
            assigned_at=datetime.utcnow() - timedelta(days=15),
            expires_at=None,
            scope="tenant",
            scope_id="tenant_1"
        ),
        UserRole(
            user_id="user_3",
            role_id="support_agent",
            assigned_by=current_admin.id,
            assigned_at=datetime.utcnow() - timedelta(days=7),
            expires_at=datetime.utcnow() + timedelta(days=30),
            scope="global",
            scope_id=None
        )
    ]

    # Apply filters
    if user_id:
        user_roles = [ur for ur in user_roles if ur.user_id == user_id]
    if role_id:
        user_roles = [ur for ur in user_roles if ur.role_id == role_id]
    if scope:
        user_roles = [ur for ur in user_roles if ur.scope == scope]

    return user_roles


@router.post("/user-roles", response_model=UserRole, status_code=status.HTTP_201_CREATED)
async def assign_user_role(
    assignment: UserRoleAssignRequest,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Assign a role to a user.
    """
    # Validate role exists
    await get_role(assignment.role_id, current_admin, db)

    # Create assignment
    user_role = UserRole(
        user_id=assignment.user_id,
        role_id=assignment.role_id,
        assigned_by=current_admin.id,
        assigned_at=datetime.utcnow(),
        expires_at=assignment.expires_at,
        scope=assignment.scope,
        scope_id=assignment.scope_id
    )

    # Log role assignment
    await _log_rbac_action(
        db=db,
        action="role_assigned",
        actor_id=current_admin.id,
        target_user_id=assignment.user_id,
        role_id=assignment.role_id,
        details={
            "scope": assignment.scope,
            "scope_id": assignment.scope_id,
            "expires_at": assignment.expires_at.isoformat() if assignment.expires_at else None
        }
    )

    return user_role


@router.delete("/user-roles", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_user_role(
    user_id: str = Query(..., description="User ID"),
    role_id: str = Query(..., description="Role ID"),
    scope: str = Query(..., description="Scope"),
    scope_id: Optional[str] = Query(None, description="Scope ID"),
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Revoke a role from a user.
    """
    # Log role revocation
    await _log_rbac_action(
        db=db,
        action="role_revoked",
        actor_id=current_admin.id,
        target_user_id=user_id,
        role_id=role_id,
        details={
            "scope": scope,
            "scope_id": scope_id
        }
    )

# Audit and Reporting


@router.get("/audit-logs", response_model=List[PermissionAuditLog])
async def get_permission_audit_logs(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    action: Optional[str] = Query(None, description="Filter by action"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(
        None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter")
):
    """
    Get RBAC audit logs with filtering and pagination.
    """
    # Build query conditions
    conditions = ["event_type LIKE 'role_%' OR event_type LIKE 'permission_%'"]
    params = {"limit": limit, "offset": offset}

    if action:
        conditions.append("event_type = :action")
        params["action"] = action

    if user_id:
        conditions.append("(actor_id = :user_id OR target_id = :user_id)")
        params["user_id"] = user_id

    if start_date:
        conditions.append("created_at >= :start_date")
        params["start_date"] = start_date

    if end_date:
        conditions.append("created_at <= :end_date")
        params["end_date"] = end_date

    where_clause = " AND ".join(conditions)

    query = text(f"""
        SELECT
            id,
            event_type as action,
            actor_id,
            target_id as target_user_id,
            details,
            created_at as timestamp,
            ip_address
        FROM audit_logs
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(query, params)

    audit_logs = []
    for row in result:
        details = row.details or {}
        audit_logs.append(PermissionAuditLog(
            id=str(row.id),
            action=row.action,
            actor_id=str(row.actor_id),
            target_user_id=str(
                row.target_user_id) if row.target_user_id else None,
            role_id=details.get("role_id"),
            permission_id=details.get("permission_id"),
            details=details,
            timestamp=row.timestamp,
            ip_address=row.ip_address
        ))

    return audit_logs

# Helper Functions


async def _log_rbac_action(
    db: AsyncSession,
    action: str,
    actor_id: str,
    target_user_id: Optional[str] = None,
    role_id: Optional[str] = None,
    permission_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log RBAC action to audit log."""
    log_entry = AuditLog(
        event_type=action,
        actor_id=actor_id,
        target_id=target_user_id,
        target_type="user" if target_user_id else None,
        details=details or {},
        ip_address="127.0.0.1"  # In production, get from request
    )

    # In production, add to database
    # db.add(log_entry)
    # await db.commit()
