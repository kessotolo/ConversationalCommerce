import React from 'react';// Removed self-import
import { ChangeEvent, FC, FormEvent } from 'react';
import React from 'react';import React, { useState, ChangeEvent, FC, FormEvent } from 'react';
import { User } from 'lucide-react';
import Permissions from '@/components/StorefrontEditor/Permissions/Permissions';
import { assignRole } from '../../../lib/api/StorefrontEditor';
import { UUID, StorefrontRole } from '../../../types/StorefrontEditor';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface AddUserPermissionProps {
  tenantId: UUID;
  onClose: () => void;
  onSuccess: () => void;
}

const AddUserPermission: React.FC<AddUserPermissionProps> = ({ 
  tenantId, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    userId: '',
    username: '',
    role: StorefrontRole.VIEWER as StorefrontRole
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userId) {
      setError('User ID is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate UUID format
      if (!isValidUUID(formData.userId)) {
        throw new Error('Invalid UUID format for User ID');
      }
      
      await assignRole(tenantId, formData.userId, { 
        role: formData.role,
        username: formData.username // Not required but helpful for display
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding user permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to add user permission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">Add User Permission</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                  User ID (UUID) *
                </label>
                <input
                  type="text"
                  id="userId"
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be a valid UUID format
                </p>
              </div>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="e.g., john.doe"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional, but helps with user identification
                </p>
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {Object.values(StorefrontRole).map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="pt-2 text-xs text-gray-500">
                <p>* Required fields</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.userId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserPermission;
