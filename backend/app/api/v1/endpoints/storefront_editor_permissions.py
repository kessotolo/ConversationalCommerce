from fastapi import APIRouter, Depends, HTTPException, status, Path, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid

from app.api.deps import get_db, get_current_user, get_current_active_user
from app.models.user import User
from app.models.storefront_permission import StorefrontRole, StorefrontSectionType
from app.schemas.storefront_permission import (
    PermissionAssignRequest,
    SectionPermissionRequest,
    ComponentPermissionRequest,
    PermissionResponse,
    UserPermissionsList
)
from app.services import storefront_permissions_service

router = APIRouter()


@router.get("/{tenant_id}/permissions", response_model=UserPermissionsList)
async def list_user_permissions(
    tenant_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all users with their permissions for a tenant's storefront.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        # First check if current user has permission to view permissions
        has_perm = await storefront_permissions_service.has_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            required_permission="manage_permissions"
        )
        
        if not has_perm:
            # If user doesn't have global permission, just return their own permissions
            user_perms = await storefront_permissions_service.get_user_permissions(
                db=db,
                tenant_id=tenant_id,
                user_id=user_id
            )
            
            return {
                "items": [user_perms],
                "total": 1
            }
        
        # If user has permissions, return all user permissions
        users_with_permissions = await storefront_permissions_service.list_users_with_permissions(
            db=db,
            tenant_id=tenant_id
        )
        
        return {
            "items": users_with_permissions,
            "total": len(users_with_permissions)
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list permissions: {str(e)}"
        )


@router.get("/{tenant_id}/permissions/{user_id}", response_model=PermissionResponse)
async def get_user_permission(
    tenant_id: uuid.UUID = Path(...),
    user_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get permissions for a specific user.
    """
    # Convert current_user.id to UUID if it's a string
    current_user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        # Check if current user has permission to view permissions or is requesting their own
        if current_user_id != user_id:
            has_perm = await storefront_permissions_service.has_permission(
                db=db,
                tenant_id=tenant_id,
                user_id=current_user_id,
                required_permission="manage_permissions"
            )
            
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view other users' permissions"
                )
        
        permissions = await storefront_permissions_service.get_user_permissions(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        return permissions
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user permissions: {str(e)}"
        )


@router.put("/{tenant_id}/permissions/{user_id}/role", response_model=PermissionResponse)
async def assign_user_role(
    tenant_id: uuid.UUID = Path(...),
    user_id: uuid.UUID = Path(...),
    permission_data: PermissionAssignRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Assign a role to a user for the storefront.
    """
    # Convert current_user.id to UUID if it's a string
    current_user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        permission = await storefront_permissions_service.assign_role(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            role=permission_data.role,
            assigned_by=current_user_id
        )
        
        return await storefront_permissions_service.get_user_permissions(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign role: {str(e)}"
        )


@router.put("/{tenant_id}/permissions/{user_id}/section", response_model=PermissionResponse)
async def set_section_permission(
    tenant_id: uuid.UUID = Path(...),
    user_id: uuid.UUID = Path(...),
    section_permission: SectionPermissionRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Set section-specific permissions for a user.
    """
    # Convert current_user.id to UUID if it's a string
    current_user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        permission = await storefront_permissions_service.set_section_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            section=section_permission.section,
            permissions=section_permission.permissions,
            assigned_by=current_user_id
        )
        
        return await storefront_permissions_service.get_user_permissions(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set section permission: {str(e)}"
        )


@router.put("/{tenant_id}/permissions/{user_id}/component", response_model=PermissionResponse)
async def set_component_permission(
    tenant_id: uuid.UUID = Path(...),
    user_id: uuid.UUID = Path(...),
    component_permission: ComponentPermissionRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Set component-specific permissions for a user.
    """
    # Convert current_user.id to UUID if it's a string
    current_user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        permission = await storefront_permissions_service.set_component_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            component_id=component_permission.component_id,
            permissions=component_permission.permissions,
            assigned_by=current_user_id
        )
        
        return await storefront_permissions_service.get_user_permissions(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set component permission: {str(e)}"
        )


@router.delete("/{tenant_id}/permissions/{user_id}", response_model=Dict[str, Any])
async def remove_user_permission(
    tenant_id: uuid.UUID = Path(...),
    user_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove all permissions for a user.
    """
    # Convert current_user.id to UUID if it's a string
    current_user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        removed = await storefront_permissions_service.remove_user_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            removed_by=current_user_id
        )
        
        return {
            "success": removed,
            "message": "Permissions removed successfully" if removed else "No permissions found to remove"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove permissions: {str(e)}"
        )


@router.get("/{tenant_id}/audit-log", response_model=List[Dict[str, Any]])
async def get_audit_log(
    tenant_id: uuid.UUID = Path(...),
    action_type: Optional[str] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get audit log for storefront changes.
    """
    # Convert current_user.id to UUID if it's a string
    current_user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        # Check if current user has permission to view audit log
        has_perm = await storefront_permissions_service.has_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=current_user_id,
            required_permission="view"
        )
        
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view the audit log"
            )
        
        # TODO: Implement actual audit log retrieval once it's available
        # For now, return a placeholder response
        return []
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit log: {str(e)}"
        )
