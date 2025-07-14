"""
Global search service package.

This package provides services for cross-tenant searching with permission filtering.
"""

from app.app.services.admin.search.service import GlobalSearchService

__all__ = ["GlobalSearchService"]
