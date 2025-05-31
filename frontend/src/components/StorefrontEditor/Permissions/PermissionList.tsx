import { FC } from 'react';import * as React from 'react';
// Removed self-import
// Removed self-import
import { List } from '@mui/material';import { PermissionListProps } from '@/components/StorefrontEditor/Permissions/PermissionList';import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Search, User } from 'lucide-react';
import { UserPermission, UUID, StorefrontRole } from '../../../types/StorefrontEditor';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon 
} from '@heroicons/react/24/outline';

interface PermissionListProps {
  users: UserPermission[];
  loading: boolean;
  selectedUserId?: UUID;
  onUserSelect: (user: UserPermission) => void;
  roleFilter: StorefrontRole | 'all';
  searchQuery: string;
  onRoleFilterChange: (role: StorefrontRole | 'all') => void;
  onSearchQueryChange: (query: string) => void;
}

const PermissionList: React.FC<PermissionListProps> = ({ 
  users, 
  loading, 
  selectedUserId, 
  onUserSelect,
  roleFilter,
  searchQuery,
  onRoleFilterChange,
  onSearchQueryChange
}) => {
  // Get role badge class based on role
  const getRoleBadgeClass = (role: StorefrontRole): string => {
    switch (role) {
      case StorefrontRole.VIEWER:
        return 'bg-gray-100 text-gray-800';
      case StorefrontRole.EDITOR:
        return 'bg-blue-100 text-blue-800';
      case StorefrontRole.PUBLISHER:
        return 'bg-green-100 text-green-800';
      case StorefrontRole.ADMIN:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="p-3 border-b">
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-1 mb-1">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Filter by role:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => onRoleFilterChange('all')}
            className={`text-xs px-3 py-1 rounded-full ${
              roleFilter === 'all' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            All Roles
          </button>
          
          {Object.values(StorefrontRole).map((role) => (
            <button 
              key={role}
              onClick={() => onRoleFilterChange(role)}
              className={`text-xs px-3 py-1 rounded-full ${
                roleFilter === role 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      {users.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-sm">No users found.</p>
          {(roleFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                onRoleFilterChange('all');
                onSearchQueryChange('');
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y overflow-y-auto max-h-[500px]">
          {users.map((user) => (
            <div
              key={user.user_id}
              onClick={() => onUserSelect(user)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedUserId === user.user_id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-gray-900 truncate" title={user.username}>
                  {user.username}
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full capitalize ${getRoleBadgeClass(user.role)}`}
                >
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1">
                User ID: {user.user_id}
              </p>
              
              {/* Permission counts */}
              <div className="mt-2 text-xs text-gray-600 flex gap-2">
                {user.global_permissions.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                    {user.global_permissions.length} global
                  </span>
                )}
                
                {Object.keys(user.section_permissions).length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                    {Object.keys(user.section_permissions).length} sections
                  </span>
                )}
                
                {Object.keys(user.component_permissions).length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                    {Object.keys(user.component_permissions).length} components
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermissionList;
