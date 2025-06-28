import {
  Check as CheckIcon,
  AlertTriangle as ExclamationTriangleIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Tag as TagIcon,
  ClipboardCopy as ClipboardDocumentIcon,
  Undo as ArrowUturnLeftIcon,
} from 'lucide-react';
import React, { useState } from 'react';

import type { UUID } from '@/modules/core/models/base';

import type { Version } from '@/modules/storefront/models/version';

interface VersionDetailProps {
  version: Version;
  tenantId: UUID;
  onRestore: (versionId: UUID) => Promise<boolean>;
}

const VersionDetail: React.FC<VersionDetailProps> = ({ version, tenantId, onRestore }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Handle restore
  const handleRestore = async () => {
    if (!isRestoring) {
      setIsRestoring(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await onRestore(version.id);

      if (success) {
        setSuccessMessage('Version restored successfully. A new draft has been created.');
        setIsRestoring(false);
      } else {
        setError('Failed to restore version.');
      }
    } catch (err) {
      setError('Failed to restore version.');
      console.error('Error restoring version:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel restore
  const cancelRestore = () => {
    setIsRestoring(false);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">Version Details</h3>
        <div className="flex items-center text-sm text-gray-500">
          <span className="font-medium">Version {version.version_number}</span>
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
        {isRestoring ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Restore Confirmation</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Are you sure you want to restore this version? This will create a new draft
                      based on this version's configuration.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={cancelRestore}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Version Summary */}
            <div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">{version.change_summary}</h2>
              <p className="text-gray-600">{version.change_description}</p>
            </div>

            {/* Version Metadata */}
            <div className="grid grid-cols-2 gap-4 border-t border-b py-4">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm">{formatDate(version.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-xs text-gray-500">Created By</p>
                  <p className="text-sm">User ID: {version.created_by}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center mb-2">
                <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-sm font-medium">Tags</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {version.tags && version.tags.length > 0 ? (
                  version.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No tags</p>
                )}
              </div>
            </div>

            {/* Configuration Snapshot */}
            <div>
              <h4 className="text-sm font-medium mb-2">Configuration Snapshot</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Configuration Data</span>
                  <button
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(version.configuration_snapshot, null, 2),
                      );
                      setSuccessMessage('Configuration copied to clipboard');
                      setTimeout(() => setSuccessMessage(null), 3000);
                    }}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                    Copy
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(version.configuration_snapshot, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isRestoring && (
        <div className="p-4 border-t">
          <button
            onClick={handleRestore}
            className="inline-flex items-center px-4 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
            Restore This Version
          </button>
        </div>
      )}
    </div>
  );
};

export default VersionDetail;
