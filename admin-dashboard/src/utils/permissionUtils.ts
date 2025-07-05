/**
 * Permission utility functions for checking user access rights
 */

export type Permission = string;

/**
 * Check if user has a specific permission
 * 
 * @param userPermissions Array of user permissions
 * @param requiredPermission The permission to check for
 * @returns Boolean indicating if user has permission
 */
export function checkPermission(
  userPermissions: Permission[] | undefined,
  requiredPermission: Permission
): boolean {
  if (!userPermissions) {
    return false;
  }

  // Check for exact permission match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard permissions (e.g., "admin:*" grants all admin permissions)
  const parts = requiredPermission.split(':');
  if (parts.length > 1) {
    const wildcardPermission = `${parts[0]}:*`;
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }

    // Check for wildcard at each level
    for (let i = 1; i < parts.length; i++) {
      const partialWildcard = parts.slice(0, i).join(':') + ':*';
      if (userPermissions.includes(partialWildcard)) {
        return true;
      }
    }
  }

  // Check for super admin permission
  if (userPermissions.includes('admin:superuser')) {
    return true;
  }

  return false;
}

/**
 * Check if user has all of the specified permissions
 * 
 * @param userPermissions Array of user permissions
 * @param requiredPermissions Array of permissions to check for
 * @returns Boolean indicating if user has all specified permissions
 */
export function checkAllPermissions(
  userPermissions: Permission[] | undefined,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every(permission => 
    checkPermission(userPermissions, permission)
  );
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param userPermissions Array of user permissions
 * @param requiredPermissions Array of permissions to check for
 * @returns Boolean indicating if user has any of the specified permissions
 */
export function checkAnyPermission(
  userPermissions: Permission[] | undefined,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some(permission => 
    checkPermission(userPermissions, permission)
  );
}

/**
 * Get a list of permissions that the user is missing from the required set
 * 
 * @param userPermissions Array of user permissions
 * @param requiredPermissions Array of permissions to check for
 * @returns Array of permissions the user is missing
 */
export function getMissingPermissions(
  userPermissions: Permission[] | undefined,
  requiredPermissions: Permission[]
): Permission[] {
  if (!userPermissions) {
    return [...requiredPermissions];
  }
  
  return requiredPermissions.filter(
    permission => !checkPermission(userPermissions, permission)
  );
}

/**
 * Convert a role name to a display-friendly format
 * 
 * @param role The role name (e.g., "system_admin")
 * @returns Formatted role name (e.g., "System Admin")
 */
export function formatRoleName(role: string): string {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
