"""
Two-Factor Authentication (2FA) service.

This service provides functionality for:
- Generating and validating TOTP codes
- Managing backup codes
- Enforcing 2FA requirements for admin users
"""

import uuid
import base64
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pyotp import TOTP, random_base32
from cryptography.fernet import Fernet

from backend.app.core.config.settings import get_settings
from backend.app.models.security.two_factor import TOTPSecret, AdminTOTPRequirement
from backend.app.models.admin.admin_user import AdminUser
from backend.app.services.audit.audit_service import AuditService


class TwoFactorService:
    """Service for managing two-factor authentication."""

    def __init__(self):
        # Initialize Fernet for encryption/decryption with the app's secret key
        # We derive a separate key for TOTP secrets using HKDF
        settings = get_settings()
        self.fernet = self._create_fernet_from_secret(
            settings.SECRET_KEY, "totp_secret_encryption")
        self.audit_service = AuditService()

    def _create_fernet_from_secret(self, secret: str, purpose: str) -> Fernet:
        """Create a Fernet instance from the app secret key and purpose."""
        # Use HKDF to derive a key from the secret and purpose
        salt = b"totp_secret_salt"  # This could be stored in settings
        info = purpose.encode()

        # Derive a key using HKDF
        derived_key = hashlib.hkdf(
            algorithm=hashlib.sha256,
            salt=salt,
            key=secret.encode(),
            info=info,
            length=32
        )

        # Base64 encode for Fernet
        key = base64.urlsafe_b64encode(derived_key)
        return Fernet(key)

    async def setup_totp(self, db: AsyncSession, user_id: uuid.UUID, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a new TOTP secret for a user.

        Args:
            db: Database session
            user_id: ID of the user
            ip_address: IP address of the user (optional)
            user_agent: User agent string (optional)

        Returns:
            Dictionary with secret key, QR code URI, and other metadata
        """
        # Check if user already has a TOTP setup
        result = await db.execute(
            select(TOTPSecret).where(TOTPSecret.user_id == user_id)
        )
        existing = result.scalars().first()

        if existing and existing.is_verified:
            raise ValueError(
                "TOTP is already set up and verified for this user")

        # Generate a new random secret
        secret = random_base32()

        # Encrypt the secret for storage
        encrypted_secret = self.fernet.encrypt(secret.encode()).decode()

        # Generate backup codes
        backup_codes, hashed_backup_codes = self._generate_backup_codes()

        # Create or update the TOTP secret record
        if existing:
            existing.encrypted_secret = encrypted_secret
            existing.is_verified = False
            existing.is_enabled = False
            existing.backup_codes = hashed_backup_codes
            existing.backup_codes_remaining = len(backup_codes)
            existing.created_at = datetime.utcnow()
            existing.created_by_ip = ip_address
            existing.created_by_user_agent = user_agent
            totp_record = existing
        else:
            totp_record = TOTPSecret(
                user_id=user_id,
                encrypted_secret=encrypted_secret,
                algorithm="SHA1",
                digits=6,
                period=30,
                is_verified=False,
                is_enabled=False,
                backup_codes=hashed_backup_codes,
                backup_codes_remaining=len(backup_codes),
                created_at=datetime.utcnow(),
                created_by_ip=ip_address,
                created_by_user_agent=user_agent
            )
            db.add(totp_record)

        await db.commit()

        # Create a TOTP object for QR code generation
        totp = TOTP(secret)

        # Get user info for the issuer name
        # In a real app, you might fetch user.email here
        issuer_name = "ConversationalCommerce Admin"
        user_identifier = str(user_id)

        # Generate QR code URI
        provisioning_uri = totp.provisioning_uri(
            name=user_identifier,
            issuer_name=issuer_name
        )

        return {
            "secret": secret,
            "qr_code_uri": provisioning_uri,
            "backup_codes": backup_codes,
            "totp_record_id": totp_record.id
        }

    def _generate_backup_codes(self, count: int = 10) -> Tuple[List[str], List[str]]:
        """
        Generate backup codes for recovery.

        Args:
            count: Number of backup codes to generate

        Returns:
            Tuple of (cleartext backup codes, hashed backup codes)
        """
        # Generate random backup codes (10 alphanumeric characters each)
        backup_codes = [
            ''.join(secrets.choice('23456789ABCDEFGHJKLMNPQRSTUVWXYZ')
                    for _ in range(10))
            for _ in range(count)
        ]

        # Hash the backup codes for storage
        # Use a simple hash since these are high-entropy one-time codes
        hashed_backup_codes = [
            hashlib.sha256(code.encode()).hexdigest()
            for code in backup_codes
        ]

        return backup_codes, hashed_backup_codes

    async def verify_totp(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        code: str
    ) -> bool:
        """
        Verify a TOTP code for a user.

        Args:
            db: Database session
            user_id: ID of the user
            code: TOTP code to verify

        Returns:
            True if the code is valid, False otherwise
        """
        # Get the user's TOTP record
        result = await db.execute(
            select(TOTPSecret).where(TOTPSecret.user_id == user_id)
        )
        totp_record = result.scalars().first()

        if not totp_record:
            return False

        # Decrypt the secret
        try:
            secret = self.fernet.decrypt(
                totp_record.encrypted_secret.encode()).decode()
        except Exception:
            # If decryption fails, the secret may have been corrupted
            return False

        # Create a TOTP object with the user's parameters
        totp = TOTP(
            secret,
            digits=totp_record.digits,
            digest=totp_record.algorithm.lower(),
            interval=totp_record.period
        )

        # Verify the code
        # Allow 1 period before/after for clock skew
        is_valid = totp.verify(code, valid_window=1)

        if is_valid:
            # Update the record to mark as verified and enabled
            if not totp_record.is_verified:
                totp_record.is_verified = True
                totp_record.verified_at = datetime.utcnow()

            totp_record.is_enabled = True
            totp_record.last_used_at = datetime.utcnow()

            await db.commit()

        return is_valid

    async def verify_backup_code(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        code: str
    ) -> bool:
        """
        Verify a backup code for a user.

        Args:
            db: Database session
            user_id: ID of the user
            code: Backup code to verify

        Returns:
            True if the code is valid, False otherwise
        """
        # Get the user's TOTP record
        result = await db.execute(
            select(TOTPSecret).where(TOTPSecret.user_id == user_id)
        )
        totp_record = result.scalars().first()

        if not totp_record or not totp_record.backup_codes or totp_record.backup_codes_remaining <= 0:
            return False

        # Hash the provided code
        hashed_code = hashlib.sha256(code.encode()).hexdigest()

        # Check if the code exists in the backup codes
        if hashed_code in totp_record.backup_codes:
            # Remove the used code and update the count
            totp_record.backup_codes.remove(hashed_code)
            totp_record.backup_codes_remaining -= 1
            totp_record.last_used_at = datetime.utcnow()

            await db.commit()

            # Log this usage in the audit log
            await self.audit_service.log_event(
                db=db,
                user_id=user_id,
                action="2fa_backup_code_used",
                resource_type="user",
                resource_id=str(user_id),
                status="success",
                details={
                    "backup_codes_remaining": totp_record.backup_codes_remaining
                }
            )

            return True

        return False

    async def disable_totp(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        admin_user_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Disable TOTP for a user.

        Args:
            db: Database session
            user_id: ID of the user
            admin_user_id: ID of the admin user performing the action (if applicable)

        Returns:
            True if TOTP was disabled, False otherwise
        """
        # Get the user's TOTP record
        result = await db.execute(
            select(TOTPSecret).where(TOTPSecret.user_id == user_id)
        )
        totp_record = result.scalars().first()

        if not totp_record or not totp_record.is_enabled:
            return False

        # Disable TOTP
        totp_record.is_enabled = False

        await db.commit()

        # Log this action in the audit log
        actor_id = admin_user_id if admin_user_id else user_id
        await self.audit_service.log_event(
            db=db,
            user_id=actor_id,
            action="2fa_disabled",
            resource_type="user",
            resource_id=str(user_id),
            status="success",
            details={
                "disabled_by": "admin" if admin_user_id else "self"
            }
        )

        return True

    async def reset_backup_codes(
        self,
        db: AsyncSession,
        user_id: uuid.UUID
    ) -> Optional[List[str]]:
        """
        Reset backup codes for a user.

        Args:
            db: Database session
            user_id: ID of the user

        Returns:
            List of new backup codes, or None if TOTP is not set up
        """
        # Get the user's TOTP record
        result = await db.execute(
            select(TOTPSecret).where(TOTPSecret.user_id == user_id)
        )
        totp_record = result.scalars().first()

        if not totp_record or not totp_record.is_verified:
            return None

        # Generate new backup codes
        backup_codes, hashed_backup_codes = self._generate_backup_codes()

        # Update the record
        totp_record.backup_codes = hashed_backup_codes
        totp_record.backup_codes_remaining = len(backup_codes)

        await db.commit()

        # Log this action in the audit log
        await self.audit_service.log_event(
            db=db,
            user_id=user_id,
            action="2fa_backup_codes_reset",
            resource_type="user",
            resource_id=str(user_id),
            status="success"
        )

        return backup_codes

    async def is_totp_enabled(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        """
        Check if TOTP is enabled for a user.

        Args:
            db: Database session
            user_id: ID of the user

        Returns:
            True if TOTP is enabled, False otherwise
        """
        result = await db.execute(
            select(TOTPSecret).where(
                TOTPSecret.user_id == user_id,
                TOTPSecret.is_verified == True,
                TOTPSecret.is_enabled == True
            )
        )
        totp_record = result.scalars().first()

        return totp_record is not None

    async def is_totp_required(self, db: AsyncSession, admin_user: AdminUser) -> bool:
        """
        Check if TOTP is required for an admin user based on role and tenant.

        Args:
            db: Database session
            admin_user: The admin user to check

        Returns:
            True if TOTP is required, False otherwise
        """
        # Super admins always require 2FA
        if admin_user.is_superadmin:
            return True

        # Check for role-specific and tenant-specific requirements
        query = select(AdminTOTPRequirement).where(
            or_(
                # Role-specific for this user (any tenant)
                and_(
                    AdminTOTPRequirement.role_id.in_(
                        [r.id for r in admin_user.roles]),
                    AdminTOTPRequirement.tenant_id == None
                ),
                # Tenant-specific for this user (any role)
                and_(
                    AdminTOTPRequirement.tenant_id == admin_user.tenant_id,
                    AdminTOTPRequirement.role_id == None
                ),
                # Role and tenant specific
                and_(
                    AdminTOTPRequirement.role_id.in_(
                        [r.id for r in admin_user.roles]),
                    AdminTOTPRequirement.tenant_id == admin_user.tenant_id
                ),
                # Global requirement (applies to all roles and tenants)
                and_(
                    AdminTOTPRequirement.role_id == None,
                    AdminTOTPRequirement.tenant_id == None
                )
            ),
            AdminTOTPRequirement.is_required == True
        )

        result = await db.execute(query)
        requirement = result.scalars().first()

        return requirement is not None

    async def set_requirement(
        self,
        db: AsyncSession,
        is_required: bool,
        role_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
        grace_period_days: int = 7,
        admin_user_id: uuid.UUID = None
    ) -> AdminTOTPRequirement:
        """
        Set a 2FA requirement for a role, tenant, or globally.

        Args:
            db: Database session
            is_required: Whether 2FA is required
            role_id: ID of the role (optional)
            tenant_id: ID of the tenant (optional)
            grace_period_days: Number of days users have to enable 2FA
            admin_user_id: ID of the admin setting the requirement

        Returns:
            The created/updated requirement record
        """
        # Check if a requirement already exists
        query = select(AdminTOTPRequirement).where(
            AdminTOTPRequirement.role_id == role_id,
            AdminTOTPRequirement.tenant_id == tenant_id
        )

        result = await db.execute(query)
        requirement = result.scalars().first()

        if requirement:
            # Update existing requirement
            requirement.is_required = is_required
            requirement.grace_period_days = grace_period_days
            requirement.updated_at = datetime.utcnow()
        else:
            # Create new requirement
            requirement = AdminTOTPRequirement(
                role_id=role_id,
                tenant_id=tenant_id,
                is_required=is_required,
                grace_period_days=grace_period_days,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=admin_user_id
            )
            db.add(requirement)

        await db.commit()
        await db.refresh(requirement)

        # Determine the scope for audit logging
        scope = "global"
        if role_id:
            scope = f"role:{role_id}"
        if tenant_id:
            scope = f"{scope}+tenant:{tenant_id}" if role_id else f"tenant:{tenant_id}"

        # Log this action in the audit log
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="2fa_requirement_set",
            resource_type="2fa_requirement",
            resource_id=str(requirement.id),
            tenant_id=tenant_id,
            status="success",
            details={
                "scope": scope,
                "is_required": is_required,
                "grace_period_days": grace_period_days
            }
        )

        return requirement
