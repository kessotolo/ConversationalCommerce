"""
Admin Team Members Endpoints

Merchant-specific team member management for admin dashboard.
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.dependencies import get_current_admin_or_seller
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from app.db.deps import get_db
from app.services.team_member_service import TeamMemberService
from app.schemas.team_member import (
    TeamMemberCreate,
    TeamMemberUpdate,
    TeamMemberResponse,
    TeamInviteCreate,
    TeamInviteResponse,
    TeamInviteAccept,
    TeamRoleEnum,
    TeamInviteStatusEnum,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[TeamMemberResponse], summary="List all team members")
async def list_team_members(
    role: Optional[TeamRoleEnum] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(
        None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """List all team members for the merchant (admin view)."""
    try:
        logger.info(f"Listing team members for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Get team members using the service layer
        team_members = await team_service.get_team_members(
            tenant_id=tenant_id,
            role=role,
            is_active=is_active,
        )

        # Convert to response format
        return [TeamMemberResponse.model_validate(member) for member in team_members]
    except Exception as e:
        logger.error(f"Error listing team members: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve team members",
        )


@router.get("/{member_id}", response_model=TeamMemberResponse, summary="Get team member details")
async def get_team_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Get details for a specific team member (admin view)."""
    try:
        logger.info(
            f"Getting team member {member_id} for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Get team member using the service layer
        team_member = await team_service.get_team_member(member_id, tenant_id)

        if not team_member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team member with ID {member_id} not found",
            )

        return TeamMemberResponse.model_validate(team_member)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting team member {member_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve team member",
        )


@router.post("/", response_model=TeamMemberResponse, summary="Add a new team member")
async def add_team_member(
    member_data: TeamMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Add a new team member to the merchant (admin view)."""
    try:
        logger.info(f"Adding team member for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Set tenant and creator info
        member_data.tenant_id = tenant_id
        member_data.created_by = UUID(current_user.user_id)

        # Add team member using the service layer
        team_member = await team_service.add_team_member(member_data)

        logger.info(f"Team member added successfully: {team_member.id}")
        return TeamMemberResponse.model_validate(team_member)
    except Exception as e:
        logger.error(f"Error adding team member: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add team member",
        )


@router.put("/{member_id}", response_model=TeamMemberResponse, summary="Update a team member")
async def update_team_member(
    member_id: UUID,
    member_data: TeamMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Update an existing team member (admin view)."""
    try:
        logger.info(
            f"Updating team member {member_id} for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Update team member using the service layer
        team_member = await team_service.update_team_member(
            member_id=member_id,
            update_data=member_data,
            tenant_id=tenant_id,
            updated_by=UUID(current_user.user_id),
        )

        logger.info(f"Team member updated successfully: {team_member.id}")
        return TeamMemberResponse.model_validate(team_member)
    except Exception as e:
        logger.error(f"Error updating team member {member_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update team member",
        )


@router.delete("/{member_id}", summary="Remove a team member")
async def remove_team_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Remove a team member from the merchant (admin view)."""
    try:
        logger.info(
            f"Removing team member {member_id} for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Remove team member using the service layer
        await team_service.remove_team_member(
            member_id=member_id,
            tenant_id=tenant_id,
            removed_by=UUID(current_user.user_id),
        )

        logger.info(f"Team member removed successfully: {member_id}")
        return {"message": "Team member removed successfully"}
    except Exception as e:
        logger.error(f"Error removing team member {member_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove team member",
        )


@router.get("/invites/", response_model=List[TeamInviteResponse], summary="List team invitations")
async def list_team_invites(
    status: Optional[TeamInviteStatusEnum] = Query(
        None, description="Filter by invite status"),
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """List all team invitations for the merchant."""
    try:
        logger.info(f"Listing team invites for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Get team invites using the service layer
        invites = await team_service.get_team_invites(
            tenant_id=tenant_id,
            status=status,
        )

        # Convert to response format
        return [TeamInviteResponse.model_validate(invite) for invite in invites]
    except Exception as e:
        logger.error(f"Error listing team invites: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve team invitations",
        )


@router.post("/invites/", response_model=TeamInviteResponse, summary="Create team invitation")
async def create_team_invite(
    invite_data: TeamInviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Create a new team invitation."""
    try:
        logger.info(f"Creating team invite for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Set tenant and creator info
        invite_data.tenant_id = tenant_id
        invite_data.invited_by = UUID(current_user.user_id)

        # Create team invite using the service layer
        invite = await team_service.create_team_invite(invite_data)

        logger.info(f"Team invite created successfully: {invite.id}")
        return TeamInviteResponse.model_validate(invite)
    except Exception as e:
        logger.error(f"Error creating team invite: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create team invitation",
        )


@router.put("/invites/{invite_id}/revoke", summary="Revoke team invitation")
async def revoke_team_invite(
    invite_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Revoke a team invitation."""
    try:
        logger.info(
            f"Revoking team invite {invite_id} for user: {current_user.user_id}")

        # Initialize team member service
        team_service = TeamMemberService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Revoke team invite using the service layer
        await team_service.revoke_team_invite(
            invite_id=invite_id,
            tenant_id=tenant_id,
            revoked_by=UUID(current_user.user_id),
        )

        logger.info(f"Team invite revoked successfully: {invite_id}")
        return {"message": "Team invitation revoked successfully"}
    except Exception as e:
        logger.error(f"Error revoking team invite {invite_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke team invitation",
        )
