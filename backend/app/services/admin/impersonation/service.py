"""
Super admin impersonation service.

This module provides functionality for super admins to impersonate tenant owners
for support and debugging purposes.
"""

import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union

from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.models.tenant.tenant import Tenant
from app.services.tenant.service import TenantService
from app.services.admin.admin_user.service import AdminUserService
from app.core.errors.exceptions import EntityNotFoundException, UnauthorizedException
from app.core.config.settings import Settings, get_settings


class ImpersonationService:
    """Service for super admin impersonation of tenant owners."""
    
    def __init__(self, settings: Settings = None):
        """Initialize the impersonation service with settings."""
        self.settings = settings or get_settings()
        self.tenant_service = TenantService()
        self.admin_user_service = AdminUserService()
        
    async def create_impersonation_token(
        self,
        db: AsyncSession,
        *,
        admin_user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create an impersonation token for a super admin to impersonate a tenant owner.
        
        Args:
            db: Database session
            admin_user_id: ID of the admin user performing the impersonation (must be super admin)
            tenant_id: ID of the tenant to impersonate
            expires_delta: Token expiration time delta (default: 30 minutes)
            
        Returns:
            Impersonation token
            
        Raises:
            UnauthorizedException: If user is not a super admin
            EntityNotFoundException: If tenant not found
        """
        # Verify that the admin is a super admin
        admin_user = await self.admin_user_service.get_admin_user_by_id(db, admin_user_id=admin_user_id)
        if not admin_user.is_super_admin:
            raise UnauthorizedException("Only super admins can impersonate tenant owners")
        
        # Verify that the tenant exists
        tenant = await self.tenant_service.get_tenant_by_id(db, tenant_id=tenant_id)
        
        # Set token expiration (default: 30 minutes)
        if expires_delta is None:
            expires_delta = timedelta(minutes=30)
            
        # Create expiration time
        expires_at = datetime.utcnow() + expires_delta
        
        # Create token payload
        token_data = {
            "sub": str(admin_user_id),
            "imp_tenant": str(tenant_id),
            "imp_admin": True,
            "exp": expires_at.timestamp(),
            "jti": secrets.token_hex(8),  # Unique token ID
            "iat": datetime.utcnow().timestamp(),
            "aud": tenant.subdomain,  # Audience is the tenant subdomain
        }
        
        # Encode token
        token = jwt.encode(
            token_data,
            self.settings.SECRET_KEY,
            algorithm=self.settings.ALGORITHM
        )
        
        # Log the impersonation (audit log)
        # This would typically write to an audit log table
        # await self.audit_log_service.log_impersonation(...)
        
        return token
    
    async def verify_impersonation_token(
        self,
        db: AsyncSession,
        *,
        token: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Verify an impersonation token and return the payload if valid.
        
        Args:
            db: Database session
            token: Impersonation token
            tenant_id: Optional tenant ID to verify against
            
        Returns:
            Token payload
            
        Raises:
            UnauthorizedException: If token is invalid or expired
        """
        try:
            # Decode token
            payload = jwt.decode(
                token,
                self.settings.SECRET_KEY,
                algorithms=[self.settings.ALGORITHM]
            )
            
            # Check if token is for impersonation
            if not payload.get("imp_admin", False):
                raise UnauthorizedException("Invalid impersonation token")
                
            # Check if token is expired (jwt.decode should already do this)
            # But we'll do it explicitly for clarity
            expiration = datetime.fromtimestamp(payload["exp"])
            if expiration < datetime.utcnow():
                raise UnauthorizedException("Impersonation token has expired")
                
            # Check tenant if specified
            if tenant_id:
                token_tenant_id = uuid.UUID(payload["imp_tenant"])
                if token_tenant_id != tenant_id:
                    raise UnauthorizedException("Impersonation token is for a different tenant")
            
            # Get the admin user
            admin_user_id = uuid.UUID(payload["sub"])
            admin_user = await self.admin_user_service.get_admin_user_by_id(
                db, admin_user_id=admin_user_id
            )
            
            # Ensure admin user is still a super admin
            if not admin_user.is_super_admin:
                raise UnauthorizedException("User is no longer a super admin")
                
            return payload
            
        except (jwt.JWTError, uuid.UUID) as e:
            raise UnauthorizedException("Invalid impersonation token") from e
    
    async def end_impersonation_session(
        self,
        db: AsyncSession,
        *,
        token: str
    ) -> None:
        """
        End an impersonation session (revoke the token).
        
        In a stateless JWT system, we can't truly revoke a token, but we can
        add it to a blocklist or record that it was explicitly ended for audit purposes.
        
        Args:
            db: Database session
            token: Impersonation token to revoke
        """
        try:
            # Decode token without verification (we just need the token ID)
            payload = jwt.decode(
                token,
                self.settings.SECRET_KEY,
                algorithms=[self.settings.ALGORITHM]
            )
            
            # Get token ID
            token_id = payload.get("jti")
            if not token_id:
                return
            
            # Add to blocklist or record end of session
            # This would typically add the token to a blocklist table
            # await self.token_blocklist.add_token(token_id, payload["exp"])
            
            # Log the end of impersonation (audit log)
            # await self.audit_log_service.log_impersonation_end(...)
            
        except jwt.JWTError:
            # Token is invalid, nothing to do
            pass
