import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Define permission types
export type PermissionScope = 'global' | 'tenant' | 'self';

export interface Permission {
  name: string;
  scope: PermissionScope;
  conditions?: Record<string, any>;
}

interface PermissionContextType {
  permissions: Permission[];
  roles: string[];
  loading: boolean;
  hasPermission: (permission: string, scope?: PermissionScope) => boolean;
  hasRole: (role: string) => boolean;
  isGlobalAdmin: boolean;
  isSuperAdmin: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  // Fetch permissions from the API
  const fetchPermissions = async (): Promise<void> => {
    if (!isAuthenticated || !token) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      setIsGlobalAdmin(false);
      setIsSuperAdmin(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      
      // Extract permissions and roles
      setPermissions(data.permissions || []);
      setRoles(data.roles || []);
      
      // Check if user is global admin or super admin
      setIsGlobalAdmin(
        data.roles.includes('global_admin') || 
        data.roles.includes('super_admin')
      );
      setIsSuperAdmin(data.roles.includes('super_admin'));
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch permissions when authenticated status changes
  useEffect(() => {
    fetchPermissions();
  }, [isAuthenticated, token]);

  // Check if user has a specific permission
  const hasPermission = (permissionName: string, scope?: PermissionScope): boolean => {
    if (!isAuthenticated) return false;
    
    // Super admin has all permissions
    if (isSuperAdmin) return true;
    
    // Check if user has the specified permission
    return permissions.some(permission => 
      permission.name === permissionName && 
      (!scope || permission.scope === scope || permission.scope === 'global')
    );
  };

  // Check if user has a specific role
  const hasRole = (roleName: string): boolean => {
    if (!isAuthenticated) return false;
    
    // Check if user has the specified role
    return roles.includes(roleName);
  };

  const contextValue: PermissionContextType = {
    permissions,
    roles,
    loading,
    hasPermission,
    hasRole,
    isGlobalAdmin,
    isSuperAdmin,
    refreshPermissions: fetchPermissions,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionProvider;
