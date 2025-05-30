import React, { useState, useEffect } from 'react';
import { getVersions, restoreVersion } from '../../../lib/api/storefrontEditor';
import { Version, UUID } from '../../../types/storefrontEditor';
import VersionList from './VersionList';
import VersionDetail from './VersionDetail';
import VersionCompare from './VersionCompare';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface VersionHistoryProps {
  tenantId: UUID;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ tenantId }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [totalVersions, setTotalVersions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(10);
  
  // Filter state
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<{start?: Date, end?: Date}>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Load versions
  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getVersions(tenantId, skip, limit, tagsFilter);
      setVersions(response.items);
      setTotalVersions(response.total);
      
      // Select first version if nothing is selected
      if (response.items.length > 0 && !selectedVersion) {
        setSelectedVersion(response.items[0]);
      }
    } catch (err) {
      setError('Failed to load versions. Please try again later.');
      console.error('Error loading versions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load versions on initial render and when filters change
  useEffect(() => {
    loadVersions();
  }, [tenantId, skip, limit, tagsFilter]);

  // Handle version selection
  const handleVersionSelect = (version: Version) => {
    if (compareMode && selectedVersion) {
      if (version.id === selectedVersion.id) {
        return; // Can't compare with itself
      }
      setCompareVersion(version);
    } else {
      setSelectedVersion(version);
      setCompareVersion(null);
    }
  };

  // Handle version restore
  const handleRestoreVersion = async (versionId: UUID) => {
    try {
      await restoreVersion(tenantId, versionId);
      setSuccessMessage('Version restored successfully. A new draft has been created.');
      setTimeout(() => setSuccessMessage(null), 5000);
      return true;
    } catch (err) {
      console.error('Error restoring version:', err);
      setError('Failed to restore version. Please try again.');
      setTimeout(() => setError(null), 5000);
      return false;
    }
  };

  // Handle compare mode toggle
  const handleCompareToggle = () => {
    setCompareMode(!compareMode);
    if (!compareMode) {
      setCompareVersion(null);
    } else {
      // Exit compare mode
      setCompareVersion(null);
    }
  };

  // Handle pagination
  const handlePageChange = (newSkip: number) => {
    setSkip(newSkip);
  };

  // Handle tags filter change
  const handleTagsFilterChange = (tags: string[]) => {
    setTagsFilter(tags);
    setSkip(0); // Reset pagination when filter changes
  };

  // Handle date filter change
  const handleDateFilterChange = (start?: Date, end?: Date) => {
    setDateFilter({ start, end });
    setSkip(0); // Reset pagination when filter changes
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSkip(0); // Reset pagination when search changes
  };

  // Filter versions by date and search query
  // (Tags filtering is done at API level)
  const filteredVersions = versions.filter(version => {
    const versionDate = new Date(version.created_at);
    
    // Apply date filter
    if (dateFilter.start && versionDate < dateFilter.start) return false;
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      if (versionDate > endDate) return false;
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesChangeSummary = version.change_summary.toLowerCase().includes(query);
      const matchesChangeDescription = version.change_description.toLowerCase().includes(query);
      const matchesTags = version.tags.some(tag => tag.toLowerCase().includes(query));
      
      if (!matchesChangeSummary && !matchesChangeDescription && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Version History</h2>
        <div className="flex space-x-2">
          <button
            onClick={loadVersions}
            className="flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleCompareToggle}
            className={`px-3 py-1.5 border text-sm font-medium rounded-md ${
              compareMode
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Versions'}
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

      {compareMode && !compareVersion && selectedVersion && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-md">
          Please select a second version to compare with "{selectedVersion.change_summary}".
        </div>
      )}

      <div className="flex-1 flex gap-6">
        {/* Version List */}
        <div className="w-1/3 bg-white rounded-lg border shadow-sm overflow-hidden">
          <VersionList
            versions={filteredVersions}
            loading={loading}
            selectedVersionId={selectedVersion?.id}
            compareVersionId={compareVersion?.id}
            compareMode={compareMode}
            onVersionSelect={handleVersionSelect}
            onTagsFilterChange={handleTagsFilterChange}
            onDateFilterChange={handleDateFilterChange}
            onSearch={handleSearch}
            tagsFilter={tagsFilter}
            dateFilter={dateFilter}
            searchQuery={searchQuery}
          />

          {/* Pagination */}
          <div className="p-3 border-t flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {filteredVersions.length > 0 ? 
                `Showing ${skip + 1}-${skip + filteredVersions.length} of ${totalVersions}` : 
                'No versions found'}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(Math.max(0, skip - limit))}
                disabled={skip === 0}
                className={`px-3 py-1 rounded text-sm ${
                  skip === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(skip + limit)}
                disabled={skip + limit >= totalVersions}
                className={`px-3 py-1 rounded text-sm ${
                  skip + limit >= totalVersions
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Version Detail or Compare */}
        <div className="w-2/3">
          {compareMode && selectedVersion && compareVersion ? (
            <VersionCompare
              version1={selectedVersion}
              version2={compareVersion}
              tenantId={tenantId}
            />
          ) : selectedVersion ? (
            <VersionDetail
              version={selectedVersion}
              tenantId={tenantId}
              onRestore={handleRestoreVersion}
            />
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 flex flex-col items-center justify-center h-full">
              <svg className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No version selected</h3>
              <p className="text-gray-500 mt-1">Select a version from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
