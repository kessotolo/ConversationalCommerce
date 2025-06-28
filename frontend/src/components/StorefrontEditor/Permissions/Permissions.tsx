import { RefreshCw as ArrowPathIcon, Plus as PlusIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { UUID } from '@/modules/core/models/base';

import AddUserPermission from '@/components/StorefrontEditor/Permissions/AddUserPermission';
import PermissionDetail from '@/components/StorefrontEditor/Permissions/PermissionDetail';
import PermissionList from '@/components/StorefrontEditor/Permissions/PermissionList';
import { getPermissions } from '@/lib/api/storefrontEditor';
import type { UserPermission, StorefrontRole } from '@/modules/storefront/models/permission';

interface PermissionsProps {
  tenantId: UUID;
}

const Permissions: React.FC<PermissionsProps> = ({ tenantId }) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [selected, setSelectedUser] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);

  // Filter state
  const [roleFilter, setRoleFilter] = useState<StorefrontRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load permissions
  const loadPermissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getPermissions(tenantId);
      // Convert Permission[] to UserPermission[]
      const perms: UserPermission[] = response.data.permissions.map((perm) => ({
        user_id: perm.user_id,
        username: '', // Username not available in Permission, set as empty
        role: perm.role,
        global_permissions: [], // Not available, set as empty
        section_permissions: perm.section_permissions || {},
        component_permissions: perm.component_permissions || {},
      }));
      setPermissions(perms);

      // Select first user if nothing is selected
      if (perms.length > 0 && !selected) {
        setSelectedUser(perms[0]);
      }
    } catch (err) {
      setError('Failed to load permissions. Please try again later.');
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load permissions on initial render
  useEffect(() => {
    loadPermissions();
    // If you want to avoid exhaustive-deps warning, add 'selected' to the dependency array if needed
    // eslint-disable-next-line
  }, [tenantId]);

  // Handle user selection
  const handleUserSelect = (user: UserPermission) => {
    setSelectedUser(user);
  };

  // Handle permission updates
  const handlePermissionUpdate = () => {
    loadPermissions();
    setSuccessMessage('Permissions updated successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Apply filters
  const filteredUsers = permissions.filter((user) => {
    // Apply role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) {
      return false;
    }

    // Apply search query
    if (searchQuery && !user.username.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Permissions Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={loadPermissions}
            className="flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddingUser(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">{successMessage}</div>
      )}

      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

      <div className="flex-1 flex gap-6">
        {/* User List */}
        <div className="w-1/3 bg-white rounded-lg border shadow-sm overflow-hidden">
          <PermissionList
            users={filteredUsers}
            loading={loading}
            selectedUserId={selected?.user_id}
            onUserSelect={handleUserSelect}
            roleFilter={roleFilter}
            searchQuery={searchQuery}
            onRoleFilterChange={setRoleFilter}
            onSearchQueryChange={setSearchQuery}
          />
        </div>

        {/* User Permission Detail */}
        <div className="w-2/3">
          {selected ? (
            <PermissionDetail
              user={selected}
              tenantId={tenantId}
              onUpdate={handlePermissionUpdate}
            />
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 flex flex-col items-center justify-center h-full">
              <svg
                className="h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No user selected</h3>
              <p className="text-gray-500 mt-1">
                Select a user to view and manage their permissions.
              </p>
              {permissions.length === 0 && !loading && (
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add User
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddingUser && (
        <AddUserPermission
          tenantId={tenantId}
          onClose={() => setIsAddingUser(false)}
          onSuccess={handlePermissionUpdate}
        />
      )}
    </div>
  );
};

export default Permissions;
