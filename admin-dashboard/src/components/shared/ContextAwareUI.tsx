import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Alert, Spinner } from '../common/UIComponents.tsx';
import { checkPermission } from '../../utils/permissionUtils';

// Types for context awareness
export type ContextType = 'admin' | 'tenant' | 'impersonated_tenant';
export type Permission = string; // e.g. 'admin:read', 'tenant:write'

interface ContextInfo {
  userId: string;
  contextType: ContextType;
  tenantId?: string;
  isImpersonating: boolean;
  originalUserId?: string;
  permissions: Permission[];
  userRole: string;
}

interface ContextAwareState {
  contextInfo: ContextInfo | null;
  isLoading: boolean;
  error: string | null;
  switchToAdminContext: () => Promise<void>;
  impersonateTenantUser: (tenantId: string, userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
}

// Create the context
const ContextAwareUIContext = createContext<ContextAwareState | undefined>(undefined);

// Context provider component
export const ContextAwareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch context information on component mount
  useEffect(() => {
    fetchContextInfo();
  }, []);

  // Fetch current context information
  const fetchContextInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('No authentication token found');
        setIsLoading(false);
        return;
      }
      
      // Use the correct API endpoint path following backend convention
      const response = await axios.get('/api/v1/admin/context/current', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setContextInfo(response.data);
      
      // Check if token is about to expire (within 5 minutes) and refresh if needed
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = tokenData.exp * 1000; // convert to milliseconds
      const currentTime = Date.now();
      
      if (expiryTime - currentTime < 300000) { // less than 5 minutes
        refreshToken();
      }
    } catch (err) {
      setError('Failed to fetch context information');
      console.error('Error fetching context info:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh the authentication token
  const refreshToken = async () => {
    try {
      const response = await axios.post('/api/v1/auth/refresh-token');
      localStorage.setItem('authToken', response.data.token);
    } catch (err) {
      console.error('Error refreshing token:', err);
      // Don't set error state as this is a background operation
    }
  };

  // Switch to admin context
  const switchToAdminContext = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/v1/admin/context/switch-to-admin', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Store the new token
      localStorage.setItem('authToken', response.data.token);
      
      // Update context info
      setContextInfo(response.data.contextInfo);
      
      // Navigate to admin dashboard
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(`Failed to switch to admin context: ${err.response?.data?.message || err.message}`);
      console.error('Error switching context:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Impersonate tenant user
  const impersonateTenantUser = async (tenantId: string, userId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/v1/admin/context/impersonate', {
        tenantId,
        userId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Store the new token
      localStorage.setItem('authToken', response.data.token);
      
      // Update context info
      setContextInfo(response.data.contextInfo);
      
      // Navigate to tenant dashboard
      navigate(`/tenant/${tenantId}/dashboard`);
    } catch (err: any) {
      setError(`Failed to impersonate tenant user: ${err.response?.data?.message || err.message}`);
      console.error('Error impersonating user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // End impersonation
  const endImpersonation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/v1/admin/context/end-impersonation', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Store the new token
      localStorage.setItem('authToken', response.data.token);
      
      // Update context info
      setContextInfo(response.data.contextInfo);
      
      // Navigate back to admin dashboard
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(`Failed to end impersonation: ${err.response?.data?.message || err.message}`);
      console.error('Error ending impersonation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    contextInfo,
    isLoading,
    error,
    switchToAdminContext,
    impersonateTenantUser,
    endImpersonation
  };

  return (
    <ContextAwareUIContext.Provider value={contextValue}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {children}
    </ContextAwareUIContext.Provider>
  );
};

// Custom hook for using the context
export const useContextAware = () => {
  const context = useContext(ContextAwareUIContext);
  
  if (context === undefined) {
    throw new Error('useContextAware must be used within a ContextAwareProvider');
  }
  
  return context;
};

// Context-aware header component that shows appropriate navigation based on context
export const ContextAwareHeader: React.FC = () => {
  const { contextInfo, isLoading, endImpersonation } = useContextAware();
  
  if (isLoading) {
    return <div className="context-header loading"><Spinner size="small" /> Loading context...</div>;
  }
  
  if (!contextInfo) {
    return <div className="context-header error">No context information available</div>;
  }

  return (
    <header className="context-header">
      <div className="context-info">
        {contextInfo.contextType === 'admin' && (
          <span className="context-badge admin">Admin Mode</span>
        )}
        
        {contextInfo.contextType === 'tenant' && (
          <span className="context-badge tenant">
            Tenant: {contextInfo.tenantId}
          </span>
        )}
        
        {contextInfo.contextType === 'impersonated_tenant' && (
          <div className="impersonation-bar">
            <span className="context-badge impersonating">
              Impersonating User in Tenant: {contextInfo.tenantId}
            </span>
            <button 
              className="end-impersonation-button"
              onClick={() => endImpersonation()}
            >
              End Impersonation
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

// Context-aware navigation menu
export const ContextAwareNavigation: React.FC = () => {
  const { contextInfo } = useContextAware();
  
  if (!contextInfo) {
    return null;
  }

  // Admin navigation links with permission checks
  if (contextInfo.contextType === 'admin') {
    return (
      <nav className="context-nav admin-nav">
        <ul>
          <li><Link to="/admin/dashboard">Dashboard</Link></li>
          {checkPermission(contextInfo.permissions, 'admin:tenant:manage') && (
            <li><Link to="/admin/tenants">Tenant Management</Link></li>
          )}
          {checkPermission(contextInfo.permissions, 'admin:user:manage') && (
            <li><Link to="/admin/users">Admin Users</Link></li>
          )}
          {checkPermission(contextInfo.permissions, 'admin:role:manage') && (
            <li><Link to="/admin/roles">Roles & Permissions</Link></li>
          )}
          {checkPermission(contextInfo.permissions, 'admin:audit:view') && (
            <li><Link to="/admin/audit-logs">Audit Logs</Link></li>
          )}
          {checkPermission(contextInfo.permissions, 'admin:feature:manage') && (
            <li><Link to="/admin/feature-flags">Feature Flags</Link></li>
          )}
          {checkPermission(contextInfo.permissions, 'admin:system:view') && (
            <li><Link to="/admin/system-health">System Health</Link></li>
          )}
          {checkPermission(contextInfo.permissions, 'admin:settings:manage') && (
            <li><Link to="/admin/settings">Admin Settings</Link></li>
          )}
        </ul>
      </nav>
    );
  }
  
  // Tenant navigation links (regular or impersonated)
  // Using React Router's Link component instead of anchor tags
  return (
    <nav className="context-nav tenant-nav">
      <ul>
        <li><Link to={`/tenant/${contextInfo.tenantId}/dashboard`}>Dashboard</Link></li>
        {checkPermission(contextInfo.permissions, 'tenant:product:view') && (
          <li><Link to={`/tenant/${contextInfo.tenantId}/products`}>Products</Link></li>
        )}
        {checkPermission(contextInfo.permissions, 'tenant:order:view') && (
          <li><Link to={`/tenant/${contextInfo.tenantId}/orders`}>Orders</Link></li>
        )}
        {checkPermission(contextInfo.permissions, 'tenant:customer:view') && (
          <li><Link to={`/tenant/${contextInfo.tenantId}/customers`}>Customers</Link></li>
        )}
        {checkPermission(contextInfo.permissions, 'tenant:settings:view') && (
          <li><Link to={`/tenant/${contextInfo.tenantId}/settings`}>Settings</Link></li>
        )}
        {contextInfo.isImpersonating && (
          <li className="impersonation-info">
            <span>Viewing as tenant user</span>
          </li>
        )}
      </ul>
    </nav>
  );
};

// Context-aware layout that provides consistent structure across contexts
export const ContextAwareLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { contextInfo } = useContextAware();
  
  const getLayoutClass = () => {
    if (!contextInfo) return 'layout-unauthorized';
    
    switch (contextInfo.contextType) {
      case 'admin':
        return 'layout-admin';
      case 'impersonated_tenant':
        return 'layout-impersonated';
      case 'tenant':
        return 'layout-tenant';
      default:
        return 'layout-default';
    }
  };

  return (
    <div className={`context-aware-layout ${getLayoutClass()}`}>
      <ContextAwareHeader />
      <div className="layout-container">
        <ContextAwareNavigation />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

// Context badge for displaying context type in UI components
export const ContextBadge: React.FC = () => {
  const { contextInfo } = useContextAware();
  
  if (!contextInfo) {
    return null;
  }

  const getBadgeClass = () => {
    switch (contextInfo.contextType) {
      case 'admin':
        return 'badge-admin';
      case 'impersonated_tenant':
        return 'badge-impersonated';
      case 'tenant':
        return 'badge-tenant';
      default:
        return 'badge-default';
    }
  };

  const getBadgeLabel = () => {
    switch (contextInfo.contextType) {
      case 'admin':
        return 'Admin';
      case 'impersonated_tenant':
        return `Impersonating (${contextInfo.tenantId})`;
      case 'tenant':
        return `Tenant: ${contextInfo.tenantId}`;
      default:
        return 'Unknown Context';
    }
  };

  return (
    <span className={`context-badge ${getBadgeClass()}`}>
      {getBadgeLabel()}
    </span>
  );
};
