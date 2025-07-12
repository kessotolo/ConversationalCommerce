from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from backend.app.api.deps import get_db, get_current_user, get_current_tenant_owner_or_admin
from backend.app.schemas.team_member import (
    TeamInviteCreate,
    TeamInviteUpdate,
    TeamInviteAccept,
    TeamInviteResponse,
    TeamRoleEnum
)
from backend.app.services.team_member_service import (
    TeamMemberService,
    TeamInviteNotFoundError,
    TeamValidationError,
)

router = APIRouter()


@router.get("/", response_model=List[TeamInviteResponse])
async def get_team_invites(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Get all team invitations for the current tenant.
    
    Only accessible by tenant owners and admins.
    """
    team_service = TeamMemberService(db)
    invites = await team_service.get_team_invites(
        tenant_id=current_user.tenant_id,
        status=status
    )
    return invites


@router.get("/{invite_id}", response_model=TeamInviteResponse)
async def get_team_invite(
    invite_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Get a specific team invitation.
    
    Only accessible by tenant owners and admins.
    """
    try:
        team_service = TeamMemberService(db)
        invite = await team_service.get_team_invite(
            invite_id=invite_id,
            tenant_id=current_user.tenant_id
        )
        return invite
    except TeamInviteNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/", response_model=TeamInviteResponse, status_code=status.HTTP_201_CREATED)
async def create_team_invite(
    invite_data: TeamInviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Create a new team invitation.
    
    Only accessible by tenant owners and admins.
    Only owners can invite new admins or owners.
    """
    # Check permissions for creating invites with elevated roles
    if invite_data.role in [TeamRoleEnum.admin, TeamRoleEnum.owner]:
        # Check if current user is an owner
        team_service = TeamMemberService(db)
        current_member = await team_service.get_team_member_by_user(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id
        )
        
        if current_member.role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners can invite new admins or owners"
            )
    
    # Ensure tenant_id matches current user's tenant
    invite_data.tenant_id = current_user.tenant_id
    invite_data.created_by = current_user.id
    
    team_service = TeamMemberService(db)
    invite = await team_service.create_team_invite(invite_data=invite_data)
    return invite


@router.patch("/{invite_id}", response_model=TeamInviteResponse)
async def update_team_invite(
    invite_id: UUID,
    update_data: TeamInviteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Update a team invitation.
    
    Only accessible by tenant owners and admins.
    """
    try:
        team_service = TeamMemberService(db)
        updated_invite = await team_service.update_team_invite(
            invite_id=invite_id,
            update_data=update_data,
            tenant_id=current_user.tenant_id,
            updated_by=current_user.id
        )
        return updated_invite
    except TeamInviteNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except TeamValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{invite_id}", response_model=TeamInviteResponse)
async def revoke_team_invite(
    invite_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Revoke a team invitation.
    
    Only accessible by tenant owners and admins.
    """
    try:
        team_service = TeamMemberService(db)
        invite = await team_service.revoke_team_invite(
            invite_id=invite_id,
            tenant_id=current_user.tenant_id,
            updated_by=current_user.id
        )
        return invite
    except TeamInviteNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except TeamValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/accept", response_model=TeamInviteResponse)
async def accept_team_invite(
    accept_data: TeamInviteAccept,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Accept a team invitation.
    
    Creates a new team member for the current user.
    """
    try:
        # Set the user ID from the current authenticated user
        accept_data.user_id = current_user.id
        
        team_service = TeamMemberService(db)
        invite, _ = await team_service.accept_team_invite(accept_data=accept_data)
        return invite
    except (TeamInviteNotFoundError, TeamValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/decline/{invite_code}", response_model=TeamInviteResponse)
async def decline_team_invite(
    invite_code: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Decline a team invitation.
    """
    try:
        team_service = TeamMemberService(db)
        invite = await team_service.decline_team_invite(
            invite_code=invite_code,
            user_id=current_user.id
        )
        return invite
    except (TeamInviteNotFoundError, TeamValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
