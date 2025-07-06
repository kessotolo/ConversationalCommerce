import {
  FunnelIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CalendarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

import type { UUID, FormSubmitEvent } from '@/modules/core/models';

import type { Version } from '@/modules/storefront/models/version';

interface VersionListProps {
  versions: Version[];
  loading: boolean;
  selectedVersionId?: string | undefined;
  compareVersionId?: string | undefined;
  compareMode: boolean;
  onVersionSelect: (version: Version) => void;
  onTagsFilterChange: (tags: string[]) => void;
  onDateFilterChange: (start?: Date, end?: Date) => void;
  onSearch: (query: string) => void;
  tagsFilter: string[];
  dateFilter: { start?: Date; end?: Date };
  searchQuery?: string;
}

const VersionList: React.FC<VersionListProps> = ({
  versions,
  loading,
  selectedVersionId,
  compareVersionId,
  compareMode,
  onVersionSelect,
  onTagsFilterChange,
  onDateFilterChange,
  onSearch,
  tagsFilter,
  dateFilter,
  searchQuery = '',
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState<string>(searchQuery || '');
  const [startDate, setStartDate] = useState(
    dateFilter.start ? formatDateForInput(dateFilter.start) : '',
  );
  const [endDate, setEndDate] = useState(dateFilter.end ? formatDateForInput(dateFilter.end) : '');

  useEffect(() => {
    setLocalSearchQuery(searchQuery as string);
  }, [searchQuery]);

  // All available tags from all versions
  const allTags = [...new Set(versions.flatMap((version) => version.tags))].sort();

  // Format date for display
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format date for input field
  function formatDateForInput(date?: Date): string {
    if (!date) return '';
    const isoString = date.toISOString().split('T')[0];
    return isoString || '';
  }

  // Handle search submission
  const handleSearch = (e: FormSubmitEvent) => {
    e.preventDefault();
    onSearch(localSearchQuery);
  };

  // Handle date filter change
  const handleDateFilterSubmit = () => {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    onDateFilterChange(start, end);
  };

  // Handle tag selection
  const handleTagToggle = (tag: string) => {
    const newTags = tagsFilter.includes(tag)
      ? tagsFilter.filter((t) => t !== tag)
      : [...tagsFilter, tag];

    onTagsFilterChange(newTags);
  };

  // Clear all filters
  const clearFilters = () => {
    setLocalSearchQuery('');
    onSearch('');
    onTagsFilterChange([]);
    // Use undefined for proper Date | undefined typing
    onDateFilterChange(undefined, undefined);
  };

  // Check if a version is selected for comparison
  const isSelectedForCompare = (versionId: UUID) => {
    return (
      (selectedVersionId && versionId === selectedVersionId) ||
      (compareVersionId && versionId === compareVersionId)
    );
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="p-3 border-b">
        <form onSubmit={handleSearch} className="mb-2">
          <div className="relative">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search versions..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <button type="submit" className="sr-only">
              Search
            </button>
          </div>
        </form>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-1" />
            Filters {(tagsFilter.length > 0 || dateFilter.start || dateFilter.end) && '(Active)'}
          </button>

          {(tagsFilter.length > 0 || dateFilter.start || dateFilter.end || searchQuery) && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800">
              Clear all filters
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {filterOpen && (
          <div className="mt-3 pt-3 border-t space-y-4">
            {/* Date Range Filter */}
            <div>
              <div className="flex items-center mb-2">
                <CalendarIcon className="h-4 w-4 text-gray-500 mr-1" />
                <h4 className="text-xs font-medium text-gray-700">Date Range</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="startDate" className="block text-xs text-gray-500">
                    From
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-xs text-gray-500">
                    To
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleDateFilterSubmit}
                className="mt-2 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply Date Filter
              </button>
            </div>

            {/* Tags Filter */}
            <div>
              <div className="flex items-center mb-2">
                <TagIcon className="h-4 w-4 text-gray-500 mr-1" />
                <h4 className="text-xs font-medium text-gray-700">Tags</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.length > 0 ? (
                  allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tagsFilter.includes(tag)
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                      {tag}
                      {tagsFilter.includes(tag) && <XMarkIcon className="ml-1 h-3 w-3" />}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No tags available</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Version List */}
      {versions.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-sm">No versions found.</p>
          {(tagsFilter.length > 0 || dateFilter.start || dateFilter.end || searchQuery) && (
            <button
              onClick={clearFilters}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y overflow-y-auto max-h-[400px]">
          {versions.map((version) => (
            <div
              key={version.id}
              onClick={() => onVersionSelect(version)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors relative ${isSelectedForCompare(version.id) ? 'bg-blue-50 border-l-4 border-blue-500 pl-3' : ''
                }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-gray-900 text-sm">{version.change_summary}</h3>
                <span className="text-xs text-gray-500">v{version.version_number}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {version.change_description}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {version.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-block bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs mr-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-500">{formatDate(version.created_at)}</div>

              {/* Compare Indicator */}
              {compareMode && isSelectedForCompare(version.id) && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {version.id === selectedVersionId ? 'Version A' : 'Version B'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VersionList;
