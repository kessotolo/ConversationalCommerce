"""
Authentication and authorization utilities for admin users.
"""

import re
import ipaddress
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.admin.admin_user import AdminUser


def validate_ip_ranges(ip_ranges: List[str]) -> None:
    """
    Validate IP ranges in CIDR notation.
    
    Args:
        ip_ranges: List of IP ranges in CIDR notation (e.g. "192.168.1.0/24")
        
    Raises:
        ValueError: If any IP range is invalid
    """
    try:
        for ip_range in ip_ranges:
            ipaddress.ip_network(ip_range)
    except ValueError as e:
        raise ValueError(f"Invalid IP range: {str(e)}")


def is_ip_allowed(ip_address: str, allowed_ranges: List[str]) -> bool:
    """
    Check if an IP address is within any of the allowed ranges.
    
    Args:
        ip_address: The IP address to check
        allowed_ranges: List of allowed IP ranges in CIDR notation
        
    Returns:
        True if the IP is within any allowed range, False otherwise
    """
    if not allowed_ranges:
        return True  # If no ranges are specified, all IPs are allowed
        
    try:
        ip = ipaddress.ip_address(ip_address)
        
        for range_str in allowed_ranges:
            network = ipaddress.ip_network(range_str)
            if ip in network:
                return True
                
        return False
    except ValueError:
        return False  # Invalid IP address or range


async def verify_admin_access(
    db: AsyncSession,
    admin_user: AdminUser,
    ip_address: Optional[str] = None,
    require_2fa: bool = True
) -> bool:
    """
    Verify if an admin user has access.
    
    Args:
        db: Database session
        admin_user: The admin user to verify
        ip_address: Optional IP address of the client
        require_2fa: Whether to enforce 2FA if required
        
    Returns:
        True if access is allowed, False otherwise
    """
    # Check if account is active
    if not admin_user.is_active:
        return False
        
    # Check IP restrictions if an IP address is provided
    if ip_address and admin_user.allowed_ip_ranges:
        if not is_ip_allowed(ip_address, admin_user.allowed_ip_ranges):
            return False
            
    # Check 2FA requirement
    if require_2fa and admin_user.require_2fa:
        # This would normally check if 2FA is verified in the current session
        # For now, we'll just return True and assume 2FA enforcement happens elsewhere
        pass
        
    return True


async def get_admin_user_permissions(
    db: AsyncSession,
    admin_user_id: UUID,
    tenant_id: Optional[UUID] = None
) -> List[dict]:
    """
    Get all permissions an admin user has through their roles.
    
    Args:
        db: Database session
        admin_user_id: ID of the admin user
        tenant_id: Optional ID of the tenant
        
    Returns:
        List of permission objects with attributes and conditions
    """
    from app.app.services.admin.admin_user.roles import get_admin_user_roles
    from app.app.services.admin.role.permissions import get_role_permissions
    
    # Get all roles assigned to the admin user
    assigned_roles = await get_admin_user_roles(
        db=db,
        admin_user_id=admin_user_id,
        tenant_id=tenant_id
    )
    
    # Collect permissions from all roles
    permissions = []
    for role, role_tenant_id in assigned_roles:
        # Include permissions from ancestor roles
        role_permissions = await get_role_permissions(
            db=db,
            role_id=role.id,
            include_ancestors=True
        )
        
        # Add each permission with its details
        for permission, condition in role_permissions:
            permission_obj = {
                'id': str(permission.id),
                'resource': permission.resource,
                'action': permission.action,
                'scope': permission.scope.value,
                'condition': condition,
                'from_role': {
                    'id': str(role.id),
                    'name': role.name,
                    'tenant_id': str(role_tenant_id) if role_tenant_id else None
                }
            }
            permissions.append(permission_obj)
            
    return permissions
