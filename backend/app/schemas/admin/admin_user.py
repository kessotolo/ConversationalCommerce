"""
Admin user schemas for API responses.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AdminUserResponse(BaseModel):
    """Response schema for admin user information."""

    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    is_super_admin: bool = Field(...,
                                 description="Whether user is a super admin")
    is_active: bool = Field(..., description="Whether user account is active")
    roles: List[str] = Field(default_factory=list, description="User roles")
    organization_source: Optional[str] = Field(
        None, description="Clerk organization source")
    clerk_organization_id: Optional[str] = Field(
        None, description="Clerk organization ID")
    clerk_organization_role: Optional[str] = Field(
        None, description="Clerk organization role")
    session_timeout_minutes: Optional[int] = Field(
        None, description="Session timeout in minutes")
    created_at: Optional[datetime] = Field(
        None, description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(
        None, description="Last update timestamp")
    last_activity_at: Optional[datetime] = Field(
        None, description="Last activity timestamp")

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    """Schema for creating a new admin user."""

    email: str = Field(..., description="User email")
    is_super_admin: bool = Field(
        False, description="Whether user is a super admin")
    is_active: bool = Field(True, description="Whether user account is active")
    clerk_organization_id: Optional[str] = Field(
        None, description="Clerk organization ID")
    clerk_organization_role: Optional[str] = Field(
        None, description="Clerk organization role")
    session_timeout_minutes: Optional[int] = Field(
        60, description="Session timeout in minutes")


class AdminUserUpdate(BaseModel):
    """Schema for updating an admin user."""

    email: Optional[str] = Field(None, description="User email")
    is_super_admin: Optional[bool] = Field(
        None, description="Whether user is a super admin")
    is_active: Optional[bool] = Field(
        None, description="Whether user account is active")
    clerk_organization_id: Optional[str] = Field(
        None, description="Clerk organization ID")
    clerk_organization_role: Optional[str] = Field(
        None, description="Clerk organization role")
    session_timeout_minutes: Optional[int] = Field(
        None, description="Session timeout in minutes")


class AdminUserListResponse(BaseModel):
    """Response schema for list of admin users."""

    users: List[AdminUserResponse] = Field(...,
                                           description="List of admin users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of users per page")
