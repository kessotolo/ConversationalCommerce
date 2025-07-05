import logging
from typing import Any, Dict, List, Optional, Union
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError

from app.core.config.settings import get_settings
from app.db.async_session import get_async_session_local
from app.services.admin.auth.dependencies import get_current_admin_user
from app.services.admin.impersonation.service import admin_impersonation_service

settings = get_settings()
logger = logging.getLogger(__name__)


class ContextType(str):
    ADMIN = "admin"
    TENANT = "tenant"
    IMPERSONATED_TENANT = "impersonated_tenant"


class ContextSession(BaseModel):
    """Session information for context switching"""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    context_type: str
    tenant_id: Optional[str] = None
    original_context_type: Optional[str] = None
    original_user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=4))
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContextSwitcher:
    """
    Utility for managing seamless transitions between admin and tenant contexts,
    especially for admin impersonation and maintaining context awareness.
    """
    
    _sessions: Dict[str, ContextSession] = {}
    
    @classmethod
    async def create_admin_context(cls, admin_user_id: str) -> ContextSession:
        """
        Create a new admin context session
        
        Args:
            admin_user_id: Admin user ID
            
        Returns:
            Context session
        """
        session = ContextSession(
            user_id=admin_user_id,
            context_type=ContextType.ADMIN
        )
        
        cls._sessions[session.session_id] = session
        return session
    
    @classmethod
    async def create_tenant_context(cls, user_id: str, tenant_id: str) -> ContextSession:
        """
        Create a new tenant context session
        
        Args:
            user_id: Tenant user ID
            tenant_id: Tenant ID
            
        Returns:
            Context session
        """
        session = ContextSession(
            user_id=user_id,
            context_type=ContextType.TENANT,
            tenant_id=tenant_id
        )
        
        cls._sessions[session.session_id] = session
        return session
    
    @classmethod
    async def create_impersonation_context(
        cls,
        admin_user_id: str,
        tenant_user_id: str,
        tenant_id: str
    ) -> ContextSession:
        """
        Create an impersonation context (admin impersonating tenant user)
        
        Args:
            admin_user_id: Admin user ID
            tenant_user_id: Tenant user ID to impersonate
            tenant_id: Tenant ID
            
        Returns:
            Context session
        """
        # Store admin information in the session
        session = ContextSession(
            user_id=tenant_user_id,  # Actual user is the tenant user
            context_type=ContextType.IMPERSONATED_TENANT,
            tenant_id=tenant_id,
            original_context_type=ContextType.ADMIN,
            original_user_id=admin_user_id,
            metadata={
                "impersonation_started_at": datetime.utcnow().isoformat()
            }
        )
        
        # Record the impersonation event
        await admin_impersonation_service.record_impersonation_start(
            admin_id=admin_user_id,
            tenant_id=tenant_id,
            user_id=tenant_user_id
        )
        
        cls._sessions[session.session_id] = session
        return session
    
    @classmethod
    async def end_impersonation(cls, session_id: str) -> Optional[ContextSession]:
        """
        End an impersonation session and return to admin context
        
        Args:
            session_id: Session ID
            
        Returns:
            New admin context session or None if not found
        """
        session = cls._sessions.get(session_id)
        if not session:
            return None
        
        # Make sure this is an impersonation session
        if session.context_type != ContextType.IMPERSONATED_TENANT:
            return None
        
        # Record impersonation end
        await admin_impersonation_service.record_impersonation_end(
            admin_id=session.original_user_id,
            tenant_id=session.tenant_id,
            user_id=session.user_id
        )
        
        # Create a new admin session
        new_session = ContextSession(
            user_id=session.original_user_id,
            context_type=ContextType.ADMIN
        )
        
        # Store new session and remove old one
        cls._sessions[new_session.session_id] = new_session
        cls._sessions.pop(session_id, None)
        
        return new_session
    
    @classmethod
    async def get_session(cls, session_id: str) -> Optional[ContextSession]:
        """
        Get a context session by ID
        
        Args:
            session_id: Session ID
            
        Returns:
            Context session or None if not found
        """
        return cls._sessions.get(session_id)
    
    @classmethod
    async def get_session_from_token(cls, token: str) -> Optional[ContextSession]:
        """
        Get a context session from a JWT token
        
        Args:
            token: JWT token
            
        Returns:
            Context session or None if not found
        """
        try:
            # Decode token
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            # Get session ID from token
            session_id = payload.get("session_id")
            if not session_id:
                return None
                
            # Get session
            return await cls.get_session(session_id)
            
        except JWTError:
            return None
    
    @classmethod
    async def create_token(cls, session: ContextSession) -> str:
        """
        Create a JWT token for a context session
        
        Args:
            session: Context session
            
        Returns:
            JWT token
        """
        # Create token data
        token_data = {
            "sub": session.user_id,
            "session_id": session.session_id,
            "context_type": session.context_type,
            "tenant_id": session.tenant_id,
            "exp": session.expires_at.timestamp()
        }
        
        # Add original user ID if impersonating
        if session.original_user_id:
            token_data["original_user_id"] = session.original_user_id
        
        # Create JWT token
        token = jwt.encode(
            token_data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        return token
    
    @classmethod
    async def get_current_context(
        cls,
        request: Request,
        db: AsyncSession = Depends(get_async_session_local)
    ) -> ContextSession:
        """
        Get the current context from request
        
        Args:
            request: FastAPI request
            db: Database session
            
        Returns:
            Current context session
            
        Raises:
            HTTPException if context is invalid
        """
        # Get authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token
        token = auth_header.split("Bearer ")[1]
        
        # Get session from token
        session = await cls.get_session_from_token(token)
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Check if session is expired
        if session.expires_at < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Session expired")
        
        return session
    
    @classmethod
    def get_context_info_from_session(cls, session: ContextSession) -> Dict[str, Any]:
        """
        Get context information for frontend display
        
        Args:
            session: Context session
            
        Returns:
            Context information for UI
        """
        context_info = {
            "user_id": session.user_id,
            "context_type": session.context_type,
            "tenant_id": session.tenant_id,
            "is_impersonating": session.context_type == ContextType.IMPERSONATED_TENANT,
        }
        
        if session.original_user_id:
            context_info["original_user_id"] = session.original_user_id
            
        return context_info


# Create a direct dependency for FastAPI routes
async def get_current_context(
    request: Request,
    db: AsyncSession = Depends(get_async_session_local)
) -> ContextSession:
    """
    FastAPI dependency for getting current context session
    
    Args:
        request: FastAPI request
        db: Database session
        
    Returns:
        Current context session
    """
    return await ContextSwitcher.get_current_context(request, db)


async def get_current_user_id_and_context(
    context: ContextSession = Depends(get_current_context)
) -> Dict[str, Any]:
    """
    FastAPI dependency for getting current user ID with context information
    
    Args:
        context: Context session
        
    Returns:
        Dictionary with user ID and context information
    """
    return {
        "user_id": context.user_id,
        "context_type": context.context_type,
        "tenant_id": context.tenant_id,
        "is_admin": context.context_type == ContextType.ADMIN,
        "is_impersonating": context.context_type == ContextType.IMPERSONATED_TENANT,
    }
