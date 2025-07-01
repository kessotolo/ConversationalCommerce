import React, { ReactNode } from 'react';
import { usePermissions, PermissionScope } from '../../contexts/PermissionContext';

interface PermissionGuardProps {
  permission?: string;
  scope?: PermissionScope;
  role?: string;
  requireSuperAdmin?: boolean;
  requireGlobalAdmin?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component that conditionally renders its children based on user permissions.
 * 
 * Use this to protect UI elements that require specific permissions.
 * 
 * @example
 * <PermissionGuard permission="tenant:edit" scope="global">
 *   <EditButton />
 * </PermissionGuard>
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  scope,
  role,
  requireSuperAdmin = false,
  requireGlobalAdmin = false,
  fallback = null,
  children,
}) => {
  const { 
    hasPermission, 
    hasRole, 
    isSuperAdmin,
    isGlobalAdmin,
    loading
  } = usePermissions();

  // While loading permissions, don't render anything
  if (loading) return null;
  
  // If super admin is required, check that first
  if (requireSuperAdmin && !isSuperAdmin) return <>{fallback}</>;
  
  // If global admin is required, check that next
  if (requireGlobalAdmin && !isGlobalAdmin) return <>{fallback}</>;
  
  // Check specific role if provided
  if (role && !hasRole(role)) return <>{fallback}</>;
  
  // Check specific permission if provided
  if (permission && !hasPermission(permission, scope)) return <>{fallback}</>;
  
  // All checks passed, render children
  return <>{children}</>;
};

export default PermissionGuard;
