"""
Admin impersonation package.

This package provides services for super admin impersonation of tenant owners.
"""

from app.app.services.admin.impersonation.service import ImpersonationService

__all__ = ["ImpersonationService"]
