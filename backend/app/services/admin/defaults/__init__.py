"""
Default definitions for the Super Admin RBAC system.

This package contains modules for initializing default roles, permissions, and their associations.
"""

from backend.app.services.admin.defaults.roles import initialize_default_roles
from backend.app.services.admin.defaults.permissions import initialize_default_permissions
from backend.app.services.admin.defaults.rbac import initialize_rbac_system
