# Super Admin RBAC System Documentation

## Overview

The Super Admin Role-Based Access Control (RBAC) system provides a robust and flexible permission model for managing administrative access to the ConversationalCommerce platform. This system allows for cross-tenant and platform-wide administrative roles with various permission scopes.

## Key Components

### Models

1. **Role**: Defines administrative roles with optional tenant scoping
   - Core roles include: Super Admin, Domain Admin, Support Admin, Read-Only Admin
   - Additional roles: Content Manager, User Manager, Analytics Viewer, Security Admin

2. **Permission**: Defines granular permissions with resource/action pairs and scope levels
   - Scopes: Global, Tenant, Self
   - System permissions are immutable and predefined

3. **RoleHierarchy**: Defines parent-child relationships between roles for inheritance
   - Permissions are inherited from parent roles (e.g., Super Admin > Domain Admin)

4. **RolePermission**: Maps permissions to roles with optional conditions

5. **AdminUser**: Extends base User with admin-specific attributes
   - Includes 2FA requirement, IP restrictions, and preferences

6. **AdminUserRole**: Assigns roles to admin users with optional tenant scope

### Services

The RBAC system is implemented with modular services adhering to the 500-line limit:

#### Permission Services

- **CRUD Operations**: Create, retrieve, update, and delete permissions
- **System Permissions**: Create default system permissions

#### Role Services

- **CRUD Operations**: Create, retrieve, update, and delete roles
- **Hierarchy Management**: Establish and traverse role hierarchies
- **Permission Assignment**: Manage permission assignments to roles
- **System Roles**: Create default system roles

#### Admin User Services

- **CRUD Operations**: Create, retrieve, update, and delete admin users
- **Role Assignment**: Manage role assignments to admin users
- **Authentication**: Handle login tracking, IP restrictions, and 2FA
- **Authorization**: Check role membership and permission access

### Authentication Flow

1. Admin login via `/admin/auth/token` endpoint
2. Two-factor authentication via `/admin/auth/two-factor` if required
3. JWT token issued with admin role information
4. Permissions enforced via middleware

## Permission Scopes

- **Global**: Access across all tenants (e.g., system settings)
- **Tenant**: Access limited to specific tenants (e.g., content management)
- **Self**: Access limited to the user's own account (e.g., profile management)

## Default Roles and Permissions

### Core Roles

1. **Super Admin**
   - Full access to all resources across all tenants
   - Not tenant-scoped

2. **Domain Admin**
   - Administrative access within specific domains/tenants
   - Tenant-scoped

3. **Support Admin**
   - Limited administrative access for support tasks
   - Not tenant-scoped

4. **Read-Only Admin**
   - Read-only access to administrative resources
   - Not tenant-scoped

### Additional Roles

5. **Content Manager**
   - Manages content within tenants
   - Tenant-scoped

6. **User Manager**
   - Manages user data within tenants
   - Tenant-scoped

7. **Analytics Viewer**
   - Views analytics and reports
   - Tenant-scoped

8. **Security Admin**
   - Manages security settings and audit logs
   - Not tenant-scoped

### Role Hierarchy

```
Super Admin
  |
  +-- Domain Admin
  |     |
  |     +-- Content Manager
  |     |
  |     +-- User Manager
  |     |
  |     +-- Analytics Viewer
  |
  +-- Security Admin
  |
  +-- Support Admin
        |
        +-- Analytics Viewer
              |
              +-- Read-Only Admin
```

## Using the RBAC System

### Creating an Admin User

```python
from app.services.admin.admin_user.service import AdminUserService

# Create admin user service
admin_user_service = AdminUserService()

# Create admin user
admin_user = await admin_user_service.create_admin_user(
    db=db,
    user_id=user.id,
    is_super_admin=True,
    require_2fa=True,
    allowed_ip_ranges=["192.168.1.0/24"]
)
```

### Assigning Roles

```python
from app.services.admin.admin_user.service import AdminUserService

# Assign role to admin user
await admin_user_service.assign_role_to_admin_user(
    db=db,
    admin_user_id=admin_user.id,
    role_id=role.id,
    tenant_id=tenant_id  # Optional for tenant-scoped roles
)
```

### Protecting Routes with Permissions

```python
from app.services.admin.auth.middleware import require_permission
from app.models.admin.permission import PermissionScope

@router.get(
    "/admin/users",
    dependencies=[require_permission("admin_users", "view", PermissionScope.GLOBAL)]
)
async def list_admin_users():
    # This route is protected and requires the "view" permission on "admin_users"
    ...
```

### Protecting Routes with Roles

```python
from app.services.admin.auth.middleware import require_role

@router.post(
    "/admin/system/settings",
    dependencies=[require_role("Super Admin")]
)
async def update_system_settings():
    # This route is protected and requires the "Super Admin" role
    ...
```

## System Initialization

During system startup, the RBAC system should be initialized to create default roles and permissions:

```python
from app.services.admin.defaults.rbac import initialize_rbac_system

# Initialize RBAC system
roles, permissions = await initialize_rbac_system(db)
```

## Security Considerations

1. **2FA**: Enforce two-factor authentication for all admin users
2. **IP Restrictions**: Limit admin access to specific IP ranges
3. **Audit Logging**: Track all administrative actions
4. **Role Separation**: Follow principle of least privilege
5. **Permission Conditions**: Use conditions for fine-grained control

## Testing

To test the RBAC system, you can use the following approaches:

1. **Unit Tests**: Test individual service functions
2. **Integration Tests**: Test role hierarchy and permission inheritance
3. **API Tests**: Test protected routes with different roles
4. **Authentication Tests**: Test login flow and 2FA
