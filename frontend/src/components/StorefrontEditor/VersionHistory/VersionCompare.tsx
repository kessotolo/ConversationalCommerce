import { ArrowRightLeft, AlertTriangle } from 'lucide-react';
import * as React from 'react';
import { useState, useEffect } from 'react';

// Using direct module imports instead of bridge files
import type { UUID } from '@/modules/core/models/base';

import type { Version, VersionDiff } from '@/modules/storefront/models/version';

import type { JSX } from 'react';

interface VersionCompareProps {
  version1: Version;
  version2: Version;
  tenantId: UUID;
}

const VersionCompare: React.FC<VersionCompareProps> = ({ version1, version2, tenantId }) => {
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load diff data
  useEffect(() => {
    const loadDiff = async () => {
      setLoading(true);
      setError(null);

      try {
        // Mock fetch for now - this would need to be implemented with actual API
        // const response = await compareVersions(tenantId, version1.id, version2.id);
        const response: VersionDiff = {
          differences: {},
          version1: version1.id,
          version2: version2.id,
        }; // Mock response with correct type
        setDiff(response);
      } catch (err) {
        setError('Failed to load comparison data. Please try again later.');
        console.error('Error loading comparison:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDiff();
  }, [tenantId, version1.id, version2.id]);

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Swap versions
  const handleSwapVersions = () => {
    // This would be handled in the parent component
    // For now, just reload the comparison with swapped IDs
    window.location.reload();
  };

  // Render diff highlight
  const renderDiffValue = (
    key: string,
    value: unknown,
    type: 'added' | 'removed' | 'changed',
  ): JSX.Element => {
    const colorClass =
      type === 'added'
        ? 'bg-green-100 text-green-800'
        : type === 'removed'
          ? 'bg-red-100 text-red-800'
          : 'bg-yellow-100 text-yellow-800';

    return (
      <div className={`p-2 rounded ${colorClass}`}>
        <div className="text-xs font-medium mb-1">{key}</div>
        <div className="text-xs whitespace-pre-wrap break-all">
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
        </div>
      </div>
    );
  };

  // Group differences by section
  const groupDifferences = (differences: Record<string, unknown>) => {
    const sections: Record<string, unknown[]> = {};

    Object.entries(differences).forEach(([path, change]) => {
      if (typeof change === 'object' && change !== null && 'path' in change && 'change' in change) {
        const parts = path.split('.');
        const section = parts[0] || 'general';

        if (!sections[section]) {
          sections[section] = [];
        }

        sections[section].push({
          path,
          change,
        });
      }
    });

    return sections;
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Compare Versions</h3>
          <button
            onClick={handleSwapVersions}
            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Swap
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border p-3 rounded-md">
            <div className="text-sm font-medium mb-1">Version A (Base)</div>
            <div className="text-xs text-gray-500 mb-1">
              v{version1.version_number} - {formatDate(version1.created_at)}
            </div>
            <div className="text-xs truncate">{version1.change_summary}</div>
          </div>

          <div className="border p-3 rounded-md">
            <div className="text-sm font-medium mb-1">Version B (Compare)</div>
            <div className="text-xs text-gray-500 mb-1">
              v{version2.version_number} - {formatDate(version2.created_at)}
            </div>
            <div className="text-xs truncate">{version2.change_summary}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        ) : diff && Object.keys(diff.differences).length > 0 ? (
          <div className="space-y-6">
            <div className="flex space-x-4">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-green-100 border border-green-800 rounded mr-1" />
                <span className="text-xs text-gray-600">Added in Version B</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-red-100 border border-red-800 rounded mr-1" />
                <span className="text-xs text-gray-600">Removed in Version B</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-800 rounded mr-1" />
                <span className="text-xs text-gray-600">Changed in Version B</span>
              </div>
            </div>

            {Object.entries(groupDifferences(diff.differences)).map(([section, changes]) => (
              <div key={section} className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 p-3 border-b font-medium text-sm capitalize">
                  {section.replace('_', ' ')}
                </div>
                <div className="p-3 space-y-3">
                  {changes.map((item, index) => {
                    const { path, change } = item as { path: string; change: unknown };

                    // Determine change type with type guard
                    let changeType: string | undefined;
                    let value: unknown, oldValue: unknown, newValue: unknown;
                    if (typeof change === 'object' && change !== null && 'type' in change) {
                      changeType = (change as { type: string }).type;
                      value = (change as Record<string, unknown>).value;
                      oldValue = (change as Record<string, unknown>).oldValue;
                      newValue = (change as Record<string, unknown>).newValue;
                    }

                    return (
                      <div key={index}>
                        <div className="text-xs text-gray-500 mb-1">{path}</div>

                        {changeType === 'added' && renderDiffValue(path, value, 'added')}

                        {changeType === 'removed' && renderDiffValue(path, value, 'removed')}

                        {changeType === 'changed' && (
                          <div className="space-y-2">
                            {renderDiffValue(`${path} (before)`, oldValue, 'removed')}
                            {renderDiffValue(`${path} (after)`, newValue, 'added')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No differences found</h3>
            <p className="text-gray-500 mt-1">These versions appear to be identical.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionCompare;
