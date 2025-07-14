from datetime import datetime, timedelta
import secrets
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, update, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.team_member import TeamMember, TeamInvite, TeamRole, TeamInviteStatus
from app.app.schemas.team_member import (
    TeamMemberCreate, 
    TeamMemberUpdate, 
    TeamInviteCreate, 
    TeamInviteUpdate,
    TeamInviteAccept
)
from app.app.services.audit_service import create_audit_log, AuditActionType
from app.app.core.exceptions import AppError

"""
Team Member Service

This service handles the business logic for team members and invitations,
providing functionality for:

- Managing team members (add, update, remove)
- Managing team roles and permissions
- Handling team invitations (create, accept, revoke)

Key business rules:
1. Each tenant must have at least one owner
2. Only owners and admins can invite new members
3. Only owners can change an admin's role
4. Team invitations expire after a configurable period
"""


class TeamError(AppError):
    """Base exception for team-related errors."""
    pass


class TeamMemberNotFoundError(TeamError):
    """Raised when a team member is not found."""
    pass


class TeamInviteNotFoundError(TeamError):
    """Raised when a team invitation is not found."""
    pass


class TeamValidationError(TeamError):
    """Raised when team operations fail validation."""
    pass


class TeamMemberService:
    """Service for handling team members and invitations."""

    # Default expiration time for team invitations in hours
    DEFAULT_INVITE_EXPIRY_HOURS = 48

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_team_members(
        self, 
        tenant_id: UUID,
        active_only: bool = True
    ) -> List[TeamMember]:
        """
        Get all team members for a tenant.
        
        Args:
            tenant_id: Tenant ID to filter by
            active_only: If True, only return active team members
            
        Returns:
            List of TeamMember objects
        """
        query = select(TeamMember).where(
            TeamMember.tenant_id == tenant_id
        )
        
        if active_only:
            query = query.where(TeamMember.is_active == True)
            
        result = await self.db.execute(query)
        team_members = result.scalars().all()
        
        return team_members

    async def get_team_member(
        self, 
        member_id: UUID, 
        tenant_id: UUID
    ) -> TeamMember:
        """
        Get a specific team member.
        
        Args:
            member_id: ID of the team member to retrieve
            tenant_id: Tenant ID for isolation
            
        Returns:
            TeamMember object
            
        Raises:
            TeamMemberNotFoundError: If the team member is not found
        """
        result = await self.db.execute(
            select(TeamMember).where(
                TeamMember.id == member_id,
                TeamMember.tenant_id == tenant_id
            )
        )
        team_member = result.scalar_one_or_none()
        
        if not team_member:
            raise TeamMemberNotFoundError(f"Team member {member_id} not found")
            
        return team_member

    async def get_team_member_by_user(
        self, 
        user_id: UUID, 
        tenant_id: UUID
    ) -> Optional[TeamMember]:
        """
        Get a team member by user ID.
        
        Args:
            user_id: User ID to find
            tenant_id: Tenant ID for isolation
            
        Returns:
            TeamMember object or None if not found
        """
        result = await self.db.execute(
            select(TeamMember).where(
                TeamMember.user_id == user_id,
                TeamMember.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def create_team_member(
        self, 
        team_member_data: TeamMemberCreate,
    ) -> TeamMember:
        """
        Create a new team member.
        
        Args:
            team_member_data: Team member data
            
        Returns:
            Created TeamMember object
        """
        # Create the team member
        team_member = TeamMember(
            tenant_id=team_member_data.tenant_id,
            user_id=team_member_data.user_id,
            role=team_member_data.role,
            email=team_member_data.email,
            full_name=team_member_data.full_name,
            custom_permissions=team_member_data.custom_permissions,
            created_by=team_member_data.created_by,
        )
        
        self.db.add(team_member)
        await self.db.commit()
        await self.db.refresh(team_member)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=team_member_data.tenant_id,
            action_type=AuditActionType.create,
            entity_type="team_member",
            entity_id=str(team_member.id),
            actor_id=str(team_member_data.created_by),
            details={
                "role": team_member_data.role,
                "email": team_member_data.email
            }
        )
        
        return team_member

    async def update_team_member(
        self, 
        member_id: UUID,
        update_data: TeamMemberUpdate,
        tenant_id: UUID,
        updated_by: UUID
    ) -> TeamMember:
        """
        Update a team member.
        
        Args:
            member_id: ID of the team member to update
            update_data: Update data
            tenant_id: Tenant ID for isolation
            updated_by: ID of the user making the update
            
        Returns:
            Updated TeamMember object
            
        Raises:
            TeamMemberNotFoundError: If the team member is not found
            TeamValidationError: If trying to change the last owner
        """
        # Get the team member
        team_member = await self.get_team_member(
            member_id=member_id,
            tenant_id=tenant_id
        )
        
        # Check if this is changing an owner role and verify there's at least one other owner
        if (team_member.role == TeamRole.owner and 
            update_data.role is not None and 
            update_data.role != TeamRole.owner):
            
            # Count owners
            result = await self.db.execute(
                select(TeamMember).where(
                    TeamMember.tenant_id == tenant_id,
                    TeamMember.role == TeamRole.owner,
                    TeamMember.is_active == True
                )
            )
            owners = result.scalars().all()
            
            if len(owners) <= 1:
                raise TeamValidationError(
                    "Cannot change the role of the last owner. "
                    "Please assign another owner first."
                )
            
        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(team_member, field, value)
            
        team_member.updated_by = updated_by
            
        await self.db.commit()
        await self.db.refresh(team_member)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="team_member",
            entity_id=str(team_member.id),
            actor_id=str(updated_by),
            details={"updated_fields": list(update_dict.keys())}
        )
        
        return team_member

    async def deactivate_team_member(
        self, 
        member_id: UUID,
        tenant_id: UUID,
        updated_by: UUID
    ) -> None:
        """
        Deactivate a team member.
        
        Args:
            member_id: ID of the team member to deactivate
            tenant_id: Tenant ID for isolation
            updated_by: ID of the user making the update
            
        Raises:
            TeamMemberNotFoundError: If the team member is not found
            TeamValidationError: If trying to deactivate the last owner
        """
        # Get the team member
        team_member = await self.get_team_member(
            member_id=member_id,
            tenant_id=tenant_id
        )
        
        # Check if this is the last owner
        if team_member.role == TeamRole.owner:
            # Count active owners
            result = await self.db.execute(
                select(TeamMember).where(
                    TeamMember.tenant_id == tenant_id,
                    TeamMember.role == TeamRole.owner,
                    TeamMember.is_active == True
                )
            )
            owners = result.scalars().all()
            
            if len(owners) <= 1:
                raise TeamValidationError(
                    "Cannot deactivate the last owner. "
                    "Please assign another owner first."
                )
        
        # Deactivate the member
        team_member.is_active = False
        team_member.updated_by = updated_by
        
        await self.db.commit()
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="team_member",
            entity_id=str(team_member.id),
            actor_id=str(updated_by),
            details={"action": "deactivate"}
        )

    async def create_team_invite(
        self, 
        invite_data: TeamInviteCreate,
        expiry_hours: int = DEFAULT_INVITE_EXPIRY_HOURS
    ) -> TeamInvite:
        """
        Create a new team invitation.
        
        Args:
            invite_data: Team invite data
            expiry_hours: Hours until invitation expires
            
        Returns:
            Created TeamInvite object
        """
        # Generate a unique invite code
        invite_code = secrets.token_urlsafe(16)
        
        # Calculate expiry time
        expires_at = datetime.now() + timedelta(hours=expiry_hours)
        
        # Create the team invite
        team_invite = TeamInvite(
            tenant_id=invite_data.tenant_id,
            email=invite_data.email,
            role=invite_data.role,
            invite_message=invite_data.invite_message,
            invite_code=invite_code,
            expires_at=expires_at,
            created_by=invite_data.created_by,
            status=TeamInviteStatus.pending
        )
        
        self.db.add(team_invite)
        await self.db.commit()
        await self.db.refresh(team_invite)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=invite_data.tenant_id,
            action_type=AuditActionType.create,
            entity_type="team_invite",
            entity_id=str(team_invite.id),
            actor_id=str(invite_data.created_by),
            details={
                "email": invite_data.email,
                "role": invite_data.role
            }
        )
        
        return team_invite

    async def get_team_invites(
        self, 
        tenant_id: UUID,
        status: Optional[TeamInviteStatus] = None
    ) -> List[TeamInvite]:
        """
        Get all team invitations for a tenant.
        
        Args:
            tenant_id: Tenant ID to filter by
            status: Optional status filter
            
        Returns:
            List of TeamInvite objects
        """
        query = select(TeamInvite).where(
            TeamInvite.tenant_id == tenant_id
        )
        
        if status:
            query = query.where(TeamInvite.status == status)
            
        query = query.order_by(desc(TeamInvite.created_at))
            
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_team_invite(
        self, 
        invite_id: UUID,
        tenant_id: UUID
    ) -> TeamInvite:
        """
        Get a specific team invitation.
        
        Args:
            invite_id: ID of the team invite to retrieve
            tenant_id: Tenant ID for isolation
            
        Returns:
            TeamInvite object
            
        Raises:
            TeamInviteNotFoundError: If the team invite is not found
        """
        result = await self.db.execute(
            select(TeamInvite).where(
                TeamInvite.id == invite_id,
                TeamInvite.tenant_id == tenant_id
            )
        )
        team_invite = result.scalar_one_or_none()
        
        if not team_invite:
            raise TeamInviteNotFoundError(f"Team invitation {invite_id} not found")
            
        return team_invite

    async def get_team_invite_by_code(
        self, 
        invite_code: str
    ) -> TeamInvite:
        """
        Get a team invitation by its invite code.
        
        Args:
            invite_code: The unique invite code
            
        Returns:
            TeamInvite object
            
        Raises:
            TeamInviteNotFoundError: If the team invite is not found
        """
        result = await self.db.execute(
            select(TeamInvite).where(
                TeamInvite.invite_code == invite_code
            )
        )
        team_invite = result.scalar_one_or_none()
        
        if not team_invite:
            raise TeamInviteNotFoundError(f"Team invitation with code {invite_code} not found")
            
        return team_invite

    async def update_team_invite(
        self, 
        invite_id: UUID,
        update_data: TeamInviteUpdate,
        tenant_id: UUID,
        updated_by: UUID
    ) -> TeamInvite:
        """
        Update a team invitation.
        
        Args:
            invite_id: ID of the team invite to update
            update_data: Update data
            tenant_id: Tenant ID for isolation
            updated_by: ID of the user making the update
            
        Returns:
            Updated TeamInvite object
            
        Raises:
            TeamInviteNotFoundError: If the team invite is not found
        """
        # Get the team invite
        team_invite = await self.get_team_invite(
            invite_id=invite_id,
            tenant_id=tenant_id
        )
        
        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(team_invite, field, value)
            
        await self.db.commit()
        await self.db.refresh(team_invite)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="team_invite",
            entity_id=str(team_invite.id),
            actor_id=str(updated_by),
            details={"updated_fields": list(update_dict.keys())}
        )
        
        return team_invite

    async def revoke_team_invite(
        self, 
        invite_id: UUID,
        tenant_id: UUID,
        updated_by: UUID
    ) -> TeamInvite:
        """
        Revoke a team invitation.
        
        Args:
            invite_id: ID of the team invite to revoke
            tenant_id: Tenant ID for isolation
            updated_by: ID of the user making the update
            
        Returns:
            Updated TeamInvite object
            
        Raises:
            TeamInviteNotFoundError: If the team invite is not found
        """
        # Get the team invite
        team_invite = await self.get_team_invite(
            invite_id=invite_id,
            tenant_id=tenant_id
        )
        
        # Check if it can be revoked
        if team_invite.status != TeamInviteStatus.pending:
            raise TeamValidationError(
                f"Cannot revoke invite with status {team_invite.status}"
            )
        
        # Revoke the invite
        team_invite.status = TeamInviteStatus.revoked
        
        await self.db.commit()
        await self.db.refresh(team_invite)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="team_invite",
            entity_id=str(team_invite.id),
            actor_id=str(updated_by),
            details={"action": "revoke"}
        )
        
        return team_invite

    async def accept_team_invite(
        self, 
        accept_data: TeamInviteAccept
    ) -> Tuple[TeamInvite, TeamMember]:
        """
        Accept a team invitation and create a team member.
        
        Args:
            accept_data: Accept data containing invite code and user ID
            
        Returns:
            Tuple of (updated TeamInvite, created TeamMember)
            
        Raises:
            TeamInviteNotFoundError: If the team invite is not found
            TeamValidationError: If the invite is expired, already used, etc.
        """
        # Get the team invite
        team_invite = await self.get_team_invite_by_code(
            invite_code=accept_data.invite_code
        )
        
        # Check if it can be accepted
        if team_invite.status != TeamInviteStatus.pending:
            raise TeamValidationError(
                f"Cannot accept invite with status {team_invite.status}"
            )
            
        # Check if it has expired
        if datetime.now() > team_invite.expires_at:
            team_invite.status = TeamInviteStatus.expired
            await self.db.commit()
            raise TeamValidationError("Invitation has expired")
            
        # Accept the invite
        team_invite.status = TeamInviteStatus.accepted
        team_invite.accepted_by = accept_data.user_id
        team_invite.responded_at = datetime.now()
        
        # Create the team member
        team_member = TeamMember(
            tenant_id=team_invite.tenant_id,
            user_id=accept_data.user_id,
            role=team_invite.role,
            email=team_invite.email,
            created_by=team_invite.created_by
        )
        
        self.db.add(team_member)
        await self.db.commit()
        await self.db.refresh(team_invite)
        await self.db.refresh(team_member)
        
        # Create audit logs
        await create_audit_log(
            self.db,
            tenant_id=team_invite.tenant_id,
            action_type=AuditActionType.update,
            entity_type="team_invite",
            entity_id=str(team_invite.id),
            actor_id=str(accept_data.user_id),
            details={"action": "accept"}
        )
        
        await create_audit_log(
            self.db,
            tenant_id=team_invite.tenant_id,
            action_type=AuditActionType.create,
            entity_type="team_member",
            entity_id=str(team_member.id),
            actor_id=str(accept_data.user_id),
            details={
                "role": team_member.role,
                "email": team_member.email,
                "invite_id": str(team_invite.id)
            }
        )
        
        return team_invite, team_member

    async def decline_team_invite(
        self, 
        invite_code: str,
        user_id: UUID
    ) -> TeamInvite:
        """
        Decline a team invitation.
        
        Args:
            invite_code: The unique invite code
            user_id: ID of the user declining the invite
            
        Returns:
            Updated TeamInvite object
            
        Raises:
            TeamInviteNotFoundError: If the team invite is not found
            TeamValidationError: If the invite cannot be declined
        """
        # Get the team invite
        team_invite = await self.get_team_invite_by_code(
            invite_code=invite_code
        )
        
        # Check if it can be declined
        if team_invite.status != TeamInviteStatus.pending:
            raise TeamValidationError(
                f"Cannot decline invite with status {team_invite.status}"
            )
            
        # Decline the invite
        team_invite.status = TeamInviteStatus.declined
        team_invite.responded_at = datetime.now()
        
        await self.db.commit()
        await self.db.refresh(team_invite)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=team_invite.tenant_id,
            action_type=AuditActionType.update,
            entity_type="team_invite",
            entity_id=str(team_invite.id),
            actor_id=str(user_id),
            details={"action": "decline"}
        )
        
        return team_invite
