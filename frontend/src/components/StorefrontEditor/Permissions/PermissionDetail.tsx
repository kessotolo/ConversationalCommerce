import React, { FC, Record, useState } from 'react';
// Removed self-import

import { CheckIcon, ExclamationTriangleIcon, PencilIcon, ShieldCheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
// Removed self-importimport * as React from 'react';

import { 
  ShieldCheckIcon, 
  TrashIcon, 
  CheckIcon, 
  ExclamationTriangleIcon, 
  PencilIcon, 
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Save, User } from 'lucide-react';
import { UserPermission, UUID, StorefrontRole, StorefrontSectionType } from '../../../types/StorefrontEditor';
import { assignRole, setSectionPermission, removePermission } from '../../../lib/api/StorefrontEditor';

interface PermissionDetailProps {
  user: UserPermission;
  tenantId: UUID;
  onUpdate: () => void;
}

const PermissionDetail: React.FC<PermissionDetailProps> = ({ 
  user, 
  tenantId, 
  onUpdate 
}) => {
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isEditingSections, setIsEditingSections] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [selectedRole, setSelectedRole] = useState<StorefrontRole>(user.role);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<StorefrontSectionType, string[]>>(
    Object.entries(user.section_permissions).reduce((acc, [section, permissions]) => {
      return {
        ...acc,
        [section as StorefrontSectionType]: permissions
      };
    }, {} as Record<StorefrontSectionType, string[]>)
  );

  // Available permissions by section
  const availablePermissions: Record<string, string[]> = {
    [StorefrontSectionType.THEME]: ['view', 'edit', 'apply'],
    [StorefrontSectionType.LAYOUT]: ['view', 'edit', 'publish'],
    [StorefrontSectionType.CONTENT]: ['view', 'edit', 'publish'],
    [StorefrontSectionType.PRODUCTS]: ['view', 'select', 'feature'],
    [StorefrontSectionType.SETTINGS]: ['view', 'edit', 'apply'],
    [StorefrontSectionType.BANNERS]: ['view', 'edit', 'publish', 'schedule'],
    [StorefrontSectionType.ASSETS]: ['view', 'upload', 'edit', 'delete'],
    [StorefrontSectionType.SEO]: ['view', 'edit', 'apply']
  };

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

  // Handle role update
  const handleRoleUpdate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await assignRole(tenantId, user.user_id, { role: selectedRole });
      setSuccessMessage('Role updated successfully');
      setIsEditingRole(false);
      onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update role');
      console.error('Error updating role:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle section permissions update
  const handleSectionUpdate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      for (const [section, permissions] of Object.entries(selectedPermissions)) {
        await setSectionPermission(tenantId, user.user_id, {
          section_type: section as StorefrontSectionType,
          permissions
        });
      }
      
      setSuccessMessage('Section permissions updated successfully');
      setIsEditingSections(false);
      onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update section permissions');
      console.error('Error updating section permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle permission removal
  const handlePermissionRemove = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await removePermission(tenantId, user.user_id);
      setSuccessMessage('User permissions removed successfully');
      setIsDeleting(false);
      onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to remove permissions');
      console.error('Error removing permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle permission for a section
  const togglePermission = (section: StorefrontSectionType, permission: string) => {
    const currentPermissions = selectedPermissions[section] || [];
    
    if (currentPermissions.includes(permission)) {
      // Remove permission
      setSelectedPermissions({
        ...selectedPermissions,
        [section]: currentPermissions.filter(p => p !== permission)
      });
    } else {
      // Add permission
      setSelectedPermissions({
        ...selectedPermissions,
        [section]: [...currentPermissions, permission]
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">User Permissions</h3>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">User:</span>
          <span className="font-medium">{user.username}</span>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="m-4 p-3 bg-green-100 text-green-800 rounded-md flex items-center">
          <CheckIcon className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="m-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {isDeleting ? (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Remove User Permissions</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Are you sure you want to remove all permissions for {user.username}? 
                      This user will no longer have any access to the storefront editor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermissionRemove}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {loading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Role */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">User Role</h4>
                {!isEditingRole && (
                  <button
                    onClick={() => setIsEditingRole(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingRole ? (
                <div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {Object.values(StorefrontRole).map((role) => (
                      <div
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`p-2 border rounded-md cursor-pointer transition-colors ${
                          selectedRole === role
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          {selectedRole === role && (
                            <CheckIcon className="h-4 w-4 text-blue-500 mr-1" />
                          )}
                          <span className={`text-sm ${selectedRole === role ? 'font-medium' : ''}`}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {role === StorefrontRole.VIEWER && 'Can view storefront but cannot make changes'}
                          {role === StorefrontRole.EDITOR && 'Can edit but requires approval to publish'}
                          {role === StorefrontRole.PUBLISHER && 'Can edit and publish changes'}
                          {role === StorefrontRole.ADMIN && 'Full access and can manage other users'}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingRole(false)}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRoleUpdate}
                      disabled={loading || selectedRole === user.role}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span
                    className={`text-sm px-2.5 py-1 rounded-full capitalize ${getRoleBadgeClass(user.role)}`}
                  >
                    {user.role}
                  </span>
                </div>
              )}
            </div>
            
            {/* Global Permissions */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Global Permissions</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                {user.global_permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.global_permissions.map((permission, index) => (
                      <span
                        key={index}
                        className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No global permissions assigned</p>
                )}
              </div>
            </div>
            
            {/* Section Permissions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">Section Permissions</h4>
                {!isEditingSections && (
                  <button
                    onClick={() => setIsEditingSections(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingSections ? (
                <div className="space-y-4">
                  {Object.values(StorefrontSectionType).map((sectionType) => {
                    const permissions = selectedPermissions[sectionType] || [];
                    
                    return (
                      <div key={sectionType} className="border rounded-md overflow-hidden">
                        <div className="bg-gray-50 p-3 border-b font-medium text-sm capitalize">
                          {sectionType.replace('_', ' ')}
                        </div>
                        <div className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {availablePermissions[sectionType]?.map((permission) => (
                              <button
                                key={permission}
                                onClick={() => togglePermission(sectionType, permission)}
                                className={`px-3 py-1 text-sm rounded-full ${
                                  permissions.includes(permission)
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                              >
                                {permission}
                                {permissions.includes(permission) && (
                                  <XMarkIcon className="ml-1 inline-block h-3 w-3" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingSections(false)}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSectionUpdate}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md">
                  {Object.keys(user.section_permissions).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(user.section_permissions).map(([section, permissions]) => (
                        <div key={section}>
                          <h5 className="text-sm font-medium text-gray-700 capitalize mb-1">
                            {section.replace('_', ' ')}
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {permissions.map((permission, index) => (
                              <span
                                key={index}
                                className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No section permissions assigned</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Component Permissions */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Component Permissions</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                {Object.keys(user.component_permissions).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(user.component_permissions).map(([component, permissions]) => (
                      <div key={component}>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">
                          {component}
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {permissions.map((permission, index) => (
                            <span
                              key={index}
                              className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No component permissions assigned</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isDeleting && !isEditingRole && !isEditingSections && (
        <div className="p-4 border-t">
          <button
            onClick={() => setIsDeleting(true)}
            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Remove All Permissions
          </button>
        </div>
      )}
    </div>
  );
};

export default PermissionDetail;
