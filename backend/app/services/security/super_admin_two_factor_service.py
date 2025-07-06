"""
Super Admin Two-Factor Authentication Service

This service provides comprehensive 2FA management specifically for Super Admin accounts:
- TOTP (Time-based One-Time Password) setup and verification
- Backup code generation and management
- 2FA enforcement for Super Admin roles
- Security audit logging for all 2FA operations
"""

import secrets
import base64
import qrcode
import io
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

import pyotp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from app.core.logging import logger
from app.models.security.two_factor import TOTPSecret, AdminTOTPRequirement
from app.models.admin.admin_user import AdminUser
from app.models.audit.audit_log import AuditLog
from app.core.security.password import get_password_hash, verify_password


class SuperAdminTwoFactorService:
    """
    Service for managing Two-Factor Authentication for Super Admin accounts.

    Provides TOTP setup, verification, backup codes, and enforcement policies
    specifically designed for Super Admin security requirements.
    """

    def __init__(self):
        self.backup_codes_count = 10
        self.backup_code_length = 8

    async def setup_totp_for_admin(
        self,
        db: AsyncSession,
        admin_user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Set up TOTP for a Super Admin user.

        Returns:
            Dict containing secret, QR code URI, and backup codes
        """
        try:
            # Check if user already has TOTP setup
            existing_totp = await db.execute(
                select(TOTPSecret).where(TOTPSecret.user_id == admin_user_id)
            )
            existing = existing_totp.scalar_one_or_none()

            if existing and existing.is_enabled:
                raise ValueError("2FA is already enabled for this user")

            # Generate new secret
            secret = pyotp.random_base32()

            # Get admin user for QR code generation
            admin_result = await db.execute(
                select(AdminUser).where(AdminUser.id == admin_user_id)
            )
            admin_user = admin_result.scalar_one_or_none()

            if not admin_user:
                raise ValueError("Admin user not found")

            # Generate QR code URI
            totp = pyotp.TOTP(secret)
            qr_uri = totp.provisioning_uri(
                name=f"admin-{admin_user_id}",
                issuer_name="ConversationalCommerce Super Admin"
            )

            # Generate backup codes
            backup_codes = [
                secrets.token_hex(self.backup_code_length // 2)
                for _ in range(self.backup_codes_count)
            ]

            # Hash backup codes for storage
            hashed_backup_codes = [
                get_password_hash(code) for code in backup_codes
            ]

            # Create or update TOTP record
            if existing:
                # Update existing record
                existing.encrypted_secret = secret  # In production, encrypt this
                existing.backup_codes = hashed_backup_codes
                existing.backup_codes_remaining = len(backup_codes)
                existing.is_verified = False
                existing.is_enabled = False
                existing.created_by_ip = ip_address
                existing.created_by_user_agent = user_agent
                totp_record = existing
            else:
                # Create new record
                totp_record = TOTPSecret(
                    user_id=admin_user_id,
                    encrypted_secret=secret,  # In production, encrypt this
                    backup_codes=hashed_backup_codes,
                    backup_codes_remaining=len(backup_codes),
                    created_by_ip=ip_address,
                    created_by_user_agent=user_agent
                )
                db.add(totp_record)

            await db.commit()

            # Log audit event
            await self._log_audit_event(
                db, admin_user_id, "totp_setup",
                {"ip_address": ip_address, "user_agent": user_agent}
            )

            return {
                "secret": secret,
                "qr_code_uri": qr_uri,
                "backup_codes": backup_codes,  # Return unhashed codes to user
                "totp_record_id": str(totp_record.id)
            }

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error setting up TOTP for admin {admin_user_id}: {str(e)}")
            raise

    async def verify_totp_code(
        self,
        db: AsyncSession,
        admin_user_id: str,
        code: str,
        enable_on_success: bool = True
    ) -> bool:
        """
        Verify a TOTP code for a Super Admin user.

        Args:
            enable_on_success: If True, enable 2FA after successful verification
        """
        try:
            # Get TOTP record
            totp_result = await db.execute(
                select(TOTPSecret).where(TOTPSecret.user_id == admin_user_id)
            )
            totp_record = totp_result.scalar_one_or_none()

            if not totp_record:
                return False

            # Create TOTP instance
            totp = pyotp.TOTP(totp_record.encrypted_secret)

            # Verify code (allow 1 window tolerance for clock drift)
            is_valid = totp.verify(code, valid_window=1)

            if is_valid:
                # Update verification status
                totp_record.last_used_at = datetime.utcnow()

                if enable_on_success:
                    totp_record.is_verified = True
                    totp_record.is_enabled = True
                    totp_record.verified_at = datetime.utcnow()

                await db.commit()

                # Log successful verification
                await self._log_audit_event(
                    db, admin_user_id, "totp_verified",
                    {"enabled": enable_on_success}
                )

                return True
            else:
                # Log failed verification
                await self._log_audit_event(
                    db, admin_user_id, "totp_verification_failed", {}
                )
                return False

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error verifying TOTP for admin {admin_user_id}: {str(e)}")
            return False

    async def verify_backup_code(
        self,
        db: AsyncSession,
        admin_user_id: str,
        backup_code: str
    ) -> bool:
        """
        Verify a backup code for a Super Admin user.
        """
        try:
            # Get TOTP record
            totp_result = await db.execute(
                select(TOTPSecret).where(TOTPSecret.user_id == admin_user_id)
            )
            totp_record = totp_result.scalar_one_or_none()

            if not totp_record or not totp_record.backup_codes:
                return False

            # Check each backup code
            for i, hashed_code in enumerate(totp_record.backup_codes):
                if verify_password(backup_code, hashed_code):
                    # Remove used backup code
                    totp_record.backup_codes.pop(i)
                    totp_record.backup_codes_remaining -= 1
                    totp_record.last_used_at = datetime.utcnow()

                    await db.commit()

                    # Log backup code usage
                    await self._log_audit_event(
                        db, admin_user_id, "backup_code_used",
                        {"remaining_codes": totp_record.backup_codes_remaining}
                    )

                    return True

            # Log failed backup code attempt
            await self._log_audit_event(
                db, admin_user_id, "backup_code_failed", {}
            )
            return False

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error verifying backup code for admin {admin_user_id}: {str(e)}")
            return False

    async def disable_totp(
        self,
        db: AsyncSession,
        admin_user_id: str,
        disabled_by_admin_id: Optional[str] = None
    ) -> bool:
        """
        Disable TOTP for a Super Admin user.
        """
        try:
            # Check if 2FA is required for this user
            if await self.is_totp_required_for_admin(db, admin_user_id):
                raise ValueError(
                    "2FA is required for this admin role and cannot be disabled")

            # Get and disable TOTP record
            totp_result = await db.execute(
                select(TOTPSecret).where(TOTPSecret.user_id == admin_user_id)
            )
            totp_record = totp_result.scalar_one_or_none()

            if not totp_record:
                return False

            # Disable TOTP
            totp_record.is_enabled = False
            totp_record.is_verified = False

            await db.commit()

            # Log disable event
            await self._log_audit_event(
                db, admin_user_id, "totp_disabled",
                {"disabled_by": disabled_by_admin_id}
            )

            return True

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error disabling TOTP for admin {admin_user_id}: {str(e)}")
            raise

    async def is_totp_enabled(self, db: AsyncSession, admin_user_id: str) -> bool:
        """Check if TOTP is enabled for a Super Admin user."""
        try:
            totp_result = await db.execute(
                select(TOTPSecret).where(
                    TOTPSecret.user_id == admin_user_id,
                    TOTPSecret.is_enabled == True
                )
            )
            return totp_result.scalar_one_or_none() is not None

        except Exception as e:
            logger.error(
                f"Error checking TOTP status for admin {admin_user_id}: {str(e)}")
            return False

    async def is_totp_required_for_admin(self, db: AsyncSession, admin_user_id: str) -> bool:
        """Check if TOTP is required for a Super Admin user based on their roles."""
        try:
            # Check if there's a global requirement for Super Admins
            requirement_result = await db.execute(
                select(AdminTOTPRequirement).where(
                    AdminTOTPRequirement.role_id.is_(None),
                    AdminTOTPRequirement.tenant_id.is_(None),
                    AdminTOTPRequirement.is_required == True
                )
            )
            global_requirement = requirement_result.scalar_one_or_none()

            if global_requirement:
                return True

            # Check role-specific requirements
            admin_result = await db.execute(
                select(AdminUser).options(selectinload(AdminUser.roles)).where(
                    AdminUser.id == admin_user_id
                )
            )
            admin_user = admin_result.scalar_one_or_none()

            if not admin_user:
                return False

            # Check if any of the user's roles require 2FA
            for role_assignment in admin_user.roles:
                requirement_result = await db.execute(
                    select(AdminTOTPRequirement).where(
                        AdminTOTPRequirement.role_id == role_assignment.role_id,
                        AdminTOTPRequirement.is_required == True
                    )
                )
                if requirement_result.scalar_one_or_none():
                    return True

            return False

        except Exception as e:
            logger.error(
                f"Error checking TOTP requirement for admin {admin_user_id}: {str(e)}")
            return False

    async def set_totp_requirement(
        self,
        db: AsyncSession,
        is_required: bool,
        role_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        grace_period_days: int = 7,
        admin_user_id: Optional[str] = None
    ) -> AdminTOTPRequirement:
        """
        Set TOTP requirement for a role, tenant, or globally.
        """
        try:
            # Check for existing requirement
            existing_result = await db.execute(
                select(AdminTOTPRequirement).where(
                    AdminTOTPRequirement.role_id == role_id,
                    AdminTOTPRequirement.tenant_id == tenant_id
                )
            )
            existing = existing_result.scalar_one_or_none()

            if existing:
                # Update existing requirement
                existing.is_required = is_required
                existing.grace_period_days = grace_period_days
                existing.updated_at = datetime.utcnow()
                requirement = existing
            else:
                # Create new requirement
                requirement = AdminTOTPRequirement(
                    role_id=role_id,
                    tenant_id=tenant_id,
                    is_required=is_required,
                    grace_period_days=grace_period_days,
                    created_by=admin_user_id
                )
                db.add(requirement)

            await db.commit()

            # Log the requirement change
            await self._log_audit_event(
                db, admin_user_id, "totp_requirement_set",
                {
                    "role_id": role_id,
                    "tenant_id": tenant_id,
                    "is_required": is_required,
                    "grace_period_days": grace_period_days
                }
            )

            return requirement

        except Exception as e:
            await db.rollback()
            logger.error(f"Error setting TOTP requirement: {str(e)}")
            raise

    async def generate_new_backup_codes(
        self,
        db: AsyncSession,
        admin_user_id: str
    ) -> List[str]:
        """
        Generate new backup codes for a Super Admin user.
        """
        try:
            # Get TOTP record
            totp_result = await db.execute(
                select(TOTPSecret).where(TOTPSecret.user_id == admin_user_id)
            )
            totp_record = totp_result.scalar_one_or_none()

            if not totp_record:
                raise ValueError("TOTP not set up for this user")

            # Generate new backup codes
            backup_codes = [
                secrets.token_hex(self.backup_code_length // 2)
                for _ in range(self.backup_codes_count)
            ]

            # Hash backup codes for storage
            hashed_backup_codes = [
                get_password_hash(code) for code in backup_codes
            ]

            # Update record
            totp_record.backup_codes = hashed_backup_codes
            totp_record.backup_codes_remaining = len(backup_codes)

            await db.commit()

            # Log backup code regeneration
            await self._log_audit_event(
                db, admin_user_id, "backup_codes_regenerated", {}
            )

            return backup_codes

        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error generating backup codes for admin {admin_user_id}: {str(e)}")
            raise

    async def _log_audit_event(
        self,
        db: AsyncSession,
        admin_user_id: str,
        action: str,
        details: Dict[str, Any]
    ):
        """Log 2FA-related audit events."""
        try:
            audit_log = AuditLog(
                user_id=admin_user_id,
                timestamp=datetime.now(timezone.utc),
                action=action,
                status="success",
                resource_type="super_admin_2fa",
                resource_id=admin_user_id,
                details=details
            )

            db.add(audit_log)
            await db.commit()

        except Exception as e:
            logger.error(f"Error logging audit event: {str(e)}")


# Create service instance
super_admin_2fa_service = SuperAdminTwoFactorService()
