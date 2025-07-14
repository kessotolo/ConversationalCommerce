"""
Clerk Organizations Service for SuperAdmin Access Control

This service handles Clerk Organizations integration specifically for SuperAdmin access:
- Organization membership validation
- SuperAdmin organization access control
- Role-based permissions within organizations
- Domain-specific authentication
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status

from app.app.core.logging import logger
from app.app.core.config.settings import get_settings


class ClerkOrganizationsService:
    """
    Service for managing Clerk Organizations access control.

    Handles SuperAdmin organization membership validation and
    domain-specific authentication controls.
    """

    def __init__(self):
        self.settings = get_settings()
        self.clerk_secret_key = os.getenv("CLERK_SECRET_KEY")
        self.clerk_base_url = "https://api.clerk.com/v1"
        self.super_admin_org_id = "org_2zWGCeV8c2H56B4ZcK5QmDOv9vL"

        if not self.clerk_secret_key:
            raise ValueError(
                "CLERK_SECRET_KEY environment variable is required")

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Clerk API requests."""
        return {
            "Authorization": f"Bearer {self.clerk_secret_key}",
            "Content-Type": "application/json"
        }

    async def get_user_organizations(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all organizations for a user.

        Args:
            user_id: Clerk user ID

        Returns:
            List of organization memberships
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.clerk_base_url}/users/{user_id}/organization_memberships",
                    headers=self._get_headers()
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get user organizations: {response.status_code} - {response.text}")
                    return []

                data = response.json()
                return data.get("data", [])

        except Exception as e:
            logger.error(f"Error getting user organizations: {str(e)}")
            return []

    async def is_super_admin(self, user_id: str) -> bool:
        """
        Check if a user is a member of the SuperAdmin organization.

        Args:
            user_id: Clerk user ID

        Returns:
            True if user is a SuperAdmin, False otherwise
        """
        try:
            organizations = await self.get_user_organizations(user_id)

            for org_membership in organizations:
                org = org_membership.get("organization", {})
                if org.get("id") == self.super_admin_org_id:
                    # Check if membership is active
                    if org_membership.get("status") == "active":
                        return True

            return False

        except Exception as e:
            logger.error(f"Error checking super admin status: {str(e)}")
            return False

    async def get_super_admin_role(self, user_id: str) -> Optional[str]:
        """
        Get the user's role within the SuperAdmin organization.

        Args:
            user_id: Clerk user ID

        Returns:
            Role name if user is SuperAdmin, None otherwise
        """
        try:
            organizations = await self.get_user_organizations(user_id)

            for org_membership in organizations:
                org = org_membership.get("organization", {})
                if org.get("id") == self.super_admin_org_id:
                    if org_membership.get("status") == "active":
                        return org_membership.get("role")

            return None

        except Exception as e:
            logger.error(f"Error getting super admin role: {str(e)}")
            return None

    async def get_organization_members(self, org_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all members of an organization.

        Args:
            org_id: Organization ID (defaults to SuperAdmin org)

        Returns:
            List of organization members
        """
        try:
            target_org_id = org_id or self.super_admin_org_id

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.clerk_base_url}/organizations/{target_org_id}/memberships",
                    headers=self._get_headers()
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get organization members: {response.status_code} - {response.text}")
                    return []

                data = response.json()
                return data.get("data", [])

        except Exception as e:
            logger.error(f"Error getting organization members: {str(e)}")
            return []

    async def invite_super_admin(self, email: str, role: str = "admin") -> Dict[str, Any]:
        """
        Invite a new user to the SuperAdmin organization.

        Args:
            email: Email address to invite
            role: Role to assign (admin, member, etc.)

        Returns:
            Invitation details
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.clerk_base_url}/organizations/{self.super_admin_org_id}/invitations",
                    headers=self._get_headers(),
                    json={
                        "email_address": email,
                        "role": role
                    }
                )

                if response.status_code not in [200, 201]:
                    logger.error(
                        f"Failed to invite super admin: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to send invitation: {response.text}"
                    )

                return response.json()

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error inviting super admin: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send invitation"
            )

    async def remove_super_admin(self, user_id: str) -> bool:
        """
        Remove a user from the SuperAdmin organization.

        Args:
            user_id: Clerk user ID to remove

        Returns:
            True if successful, False otherwise
        """
        try:
            # First, get the membership ID
            organizations = await self.get_user_organizations(user_id)
            membership_id = None

            for org_membership in organizations:
                org = org_membership.get("organization", {})
                if org.get("id") == self.super_admin_org_id:
                    membership_id = org_membership.get("id")
                    break

            if not membership_id:
                logger.warning(
                    f"User {user_id} is not a member of SuperAdmin organization")
                return False

            # Remove the membership
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.clerk_base_url}/organization_memberships/{membership_id}",
                    headers=self._get_headers()
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to remove super admin: {response.status_code} - {response.text}")
                    return False

                return True

        except Exception as e:
            logger.error(f"Error removing super admin: {str(e)}")
            return False

    async def update_super_admin_role(self, user_id: str, new_role: str) -> bool:
        """
        Update a SuperAdmin's role within the organization.

        Args:
            user_id: Clerk user ID
            new_role: New role to assign

        Returns:
            True if successful, False otherwise
        """
        try:
            # First, get the membership ID
            organizations = await self.get_user_organizations(user_id)
            membership_id = None

            for org_membership in organizations:
                org = org_membership.get("organization", {})
                if org.get("id") == self.super_admin_org_id:
                    membership_id = org_membership.get("id")
                    break

            if not membership_id:
                logger.warning(
                    f"User {user_id} is not a member of SuperAdmin organization")
                return False

            # Update the role
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.clerk_base_url}/organization_memberships/{membership_id}",
                    headers=self._get_headers(),
                    json={"role": new_role}
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to update super admin role: {response.status_code} - {response.text}")
                    return False

                return True

        except Exception as e:
            logger.error(f"Error updating super admin role: {str(e)}")
            return False

    async def get_organization_info(self, org_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get organization information.

        Args:
            org_id: Organization ID (defaults to SuperAdmin org)

        Returns:
            Organization details
        """
        try:
            target_org_id = org_id or self.super_admin_org_id

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.clerk_base_url}/organizations/{target_org_id}",
                    headers=self._get_headers()
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get organization info: {response.status_code} - {response.text}")
                    return None

                return response.json()

        except Exception as e:
            logger.error(f"Error getting organization info: {str(e)}")
            return None

    async def validate_domain_access(self, user_id: str, domain: str) -> bool:
        """
        Validate if a user can access a specific domain.

        Args:
            user_id: Clerk user ID
            domain: Domain being accessed (e.g., 'enwhe.com', 'enwhe.io')

        Returns:
            True if access is allowed, False otherwise
        """
        try:
            # For SuperAdmin domain (enwhe.com), require SuperAdmin organization membership
            if domain in ["enwhe.com", "admin.enwhe.com"]:
                return await self.is_super_admin(user_id)

            # For main app domain (enwhe.io), allow regular users
            if domain in ["enwhe.io", "app.enwhe.io"]:
                # Check if user exists and is active
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.clerk_base_url}/users/{user_id}",
                        headers=self._get_headers()
                    )

                    if response.status_code == 200:
                        user_data = response.json()
                        return user_data.get("banned") is False

            return False

        except Exception as e:
            logger.error(f"Error validating domain access: {str(e)}")
            return False


# Create service instance
clerk_organizations_service = ClerkOrganizationsService()
