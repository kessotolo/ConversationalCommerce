from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from backend.app.api.deps import get_db, get_current_user, get_current_tenant_owner_or_admin
from backend.app.schemas.team_member import (
    TeamMemberResponse,
    TeamMemberCreate,
    TeamMemberUpdate,
)
from backend.app.services.team_member_service import (
    TeamMemberService,
    TeamMemberNotFoundError,
    TeamValidationError,
)

router = APIRouter()


@router.get("/", response_model=List[TeamMemberResponse])
async def get_team_members(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Get all team members for the current tenant.
    
    Only accessible by tenant owners and admins.
    """
    team_service = TeamMemberService(db)
    team_members = await team_service.get_team_members(
        tenant_id=current_user.tenant_id,
        active_only=active_only
    )
    return team_members


@router.get("/{member_id}", response_model=TeamMemberResponse)
async def get_team_member(
    member_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Get a specific team member.
    
    Only accessible by tenant owners and admins.
    """
    try:
        team_service = TeamMemberService(db)
        team_member = await team_service.get_team_member(
            member_id=member_id,
            tenant_id=current_user.tenant_id
        )
        return team_member
    except TeamMemberNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def create_team_member(
    team_member_data: TeamMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Create a new team member.
    
    Only accessible by tenant owners and admins.
    This is typically used when manually adding users rather than through invitations.
    """
    # Ensure tenant_id matches current user's tenant
    if team_member_data.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create team member for a different tenant"
        )
    
    # Set the creator ID
    team_member_data.created_by = current_user.id
    
    team_service = TeamMemberService(db)
    team_member = await team_service.create_team_member(
        team_member_data=team_member_data
    )
    return team_member


@router.patch("/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(
    member_id: UUID,
    update_data: TeamMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Update a team member.
    
    Only accessible by tenant owners and admins.
    Admins cannot change the role of other admins or owners.
    Only owners can change an admin's role.
    """
    try:
        team_service = TeamMemberService(db)
        
        # Check permissions for role changes
        if update_data.role is not None:
            # Get the member we're trying to update
            member_to_update = await team_service.get_team_member(
                member_id=member_id,
                tenant_id=current_user.tenant_id
            )
            
            # Check if the current user is an admin trying to change an owner or another admin
            current_member = await team_service.get_team_member_by_user(
                user_id=current_user.id,
                tenant_id=current_user.tenant_id
            )
            
            if (current_member.role == "admin" and 
                (member_to_update.role == "owner" or member_to_update.role == "admin")):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admins cannot change the role of owners or other admins"
                )
        
        updated_member = await team_service.update_team_member(
            member_id=member_id,
            update_data=update_data,
            tenant_id=current_user.tenant_id,
            updated_by=current_user.id
        )
        return updated_member
    except TeamMemberNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except TeamValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_team_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_tenant_owner_or_admin)
):
    """
    Deactivate a team member.
    
    Only accessible by tenant owners and admins.
    Admins cannot deactivate owners or other admins.
    At least one owner must remain active for the tenant.
    """
    try:
        team_service = TeamMemberService(db)
        
        # Check if the current user is trying to deactivate an owner or admin
        member_to_deactivate = await team_service.get_team_member(
            member_id=member_id,
            tenant_id=current_user.tenant_id
        )
        
        # Check permissions
        current_member = await team_service.get_team_member_by_user(
            user_id=current_user.id, 
            tenant_id=current_user.tenant_id
        )
        
        if (current_member.role == "admin" and 
            (member_to_deactivate.role == "owner" or member_to_deactivate.role == "admin")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot deactivate owners or other admins"
            )
            
        # Cannot deactivate yourself
        if member_to_deactivate.user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate yourself"
            )
        
        await team_service.deactivate_team_member(
            member_id=member_id,
            tenant_id=current_user.tenant_id,
            updated_by=current_user.id
        )
    except TeamMemberNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except TeamValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
