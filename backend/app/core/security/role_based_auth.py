from fastapi import Depends, HTTPException, status
from typing import List, Optional, Callable, Any
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from app.core.errors.error_response import forbidden_error


def require_role(required_role: str):
    """
    Dependency that requires the user to have a specific role.
    
    Args:
        required_role: The role that the user must have
        
    Returns:
        A dependency function that validates the user has the required role
    """
    def dependency(current_user: ClerkTokenData = Depends(require_auth)) -> ClerkTokenData:
        if not current_user.has_role(required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires {required_role} role"
            )
        return current_user
    
    return dependency


def require_any_role(required_roles: List[str]):
    """
    Dependency that requires the user to have at least one of the specified roles.
    
    Args:
        required_roles: List of roles, any of which the user must have
        
    Returns:
        A dependency function that validates the user has at least one of the required roles
    """
    def dependency(current_user: ClerkTokenData = Depends(require_auth)) -> ClerkTokenData:
        if not current_user.has_any_role(required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(required_roles)}"
            )
        return current_user
    
    return dependency


def require_all_roles(required_roles: List[str]):
    """
    Dependency that requires the user to have all of the specified roles.
    
    Args:
        required_roles: List of roles that the user must have
        
    Returns:
        A dependency function that validates the user has all of the required roles
    """
    def dependency(current_user: ClerkTokenData = Depends(require_auth)) -> ClerkTokenData:
        if not current_user.has_all_roles(required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires all of these roles: {', '.join(required_roles)}"
            )
        return current_user
    
    return dependency


# Common role-based dependencies
require_admin = require_role("admin")
require_seller = require_role("seller")
require_customer = require_role("customer")


def resource_owner_or_admin(
    get_resource_owner_id: Callable[[Any], str],
    resource_param_name: str = "resource_id"
):
    """
    Dependency that requires the user to be either the owner of the resource or an admin.
    
    Args:
        get_resource_owner_id: Function that retrieves the owner ID of the resource
        resource_param_name: Name of the path or query parameter containing the resource ID
        
    Returns:
        A dependency function that validates the user's ownership or admin status
    """
    async def dependency(
        current_user: ClerkTokenData = Depends(require_auth),
        **path_params
    ) -> ClerkTokenData:
        # If user is admin, allow access regardless of ownership
        if current_user.has_role("admin"):
            return current_user
            
        # Get the resource ID from path parameters
        resource_id = path_params.get(resource_param_name)
        if not resource_id:
            raise ValueError(f"Path parameter '{resource_param_name}' not found")
            
        # Get the owner ID of the resource
        owner_id = get_resource_owner_id(resource_id)
        
        # Check if the current user is the owner
        if str(current_user.user_id) != str(owner_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
            
        return current_user
        
    return dependency
