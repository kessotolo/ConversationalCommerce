import React, { FC, useState, useEffect } from 'react';
// Removed self-import

import { List, Select } from '@mui/material';
import { User } from 'lucide-react';import * as React from 'react';

import { getPermissions } from '../../../lib/api/StorefrontEditor';
import { UUID, UserPermission, StorefrontRole } from '../../../types/StorefrontEditor';
import PermissionList from './PermissionList';
import PermissionDetail from './PermissionDetail';
import AddUserPermission from './AddUserPermission';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface PermissionsProps {
  tenantId: UUID;
}

const Permissions: React.FC<PermissionsProps> = ({ tenantId }) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Filter state
  const [roleFilter, setRoleFilter] = useState<StorefrontRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load permissions
  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getPermissions(tenantId);
      setPermissions(response.items);
      
      // Select first user if nothing is selected
      if (response.items.length > 0 && !selectedUser) {
        setSelectedUser(response.items[0]);
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
  const filteredUsers = permissions.filter(user => {
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
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      <div className="flex-1 flex gap-6">
        {/* User List */}
        <div className="w-1/3 bg-white rounded-lg border shadow-sm overflow-hidden">
          <PermissionList
            users={filteredUsers}
            loading={loading}
            selectedUserId={selectedUser?.user_id}
            onUserSelect={handleUserSelect}
            roleFilter={roleFilter}
            searchQuery={searchQuery}
            onRoleFilterChange={setRoleFilter}
            onSearchQueryChange={setSearchQuery}
          />
        </div>

        {/* User Permission Detail */}
        <div className="w-2/3">
          {selectedUser ? (
            <PermissionDetail
              user={selectedUser}
              tenantId={tenantId}
              onUpdate={handlePermissionUpdate}
            />
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 flex flex-col items-center justify-center h-full">
              <svg className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No user selected</h3>
              <p className="text-gray-500 mt-1">Select a user to view and manage their permissions.</p>
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
