import { FC, FormEvent } from 'react';import { AssetFilterBarProps } from '@/components/StorefrontEditor/AssetManagement/AssetFilterBar';
// Removed self-import
import { Search } from 'lucide-react';import * as React from 'react';
// Removed self-import
import { AssetType } from '../../../types/StorefrontEditor';
import { MagnifyingGlassIcon, FunnelIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface AssetFilterBarProps {
  assetType: AssetType | null;
  searchQuery: string;
  sortBy: string;
  sortDesc: boolean;
  onFilterChange: (type: AssetType | null, query: string, sort: string, direction: boolean) => void;
}

const AssetFilterBar: React.FC<AssetFilterBarProps> = ({
  assetType,
  searchQuery,
  sortBy,
  sortDesc,
  onFilterChange,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [filterOpen, setFilterOpen] = useState(false);

  // Update local search when prop changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(assetType, localSearchQuery, sortBy, sortDesc);
  };

  // Handle asset type filter
  const handleAssetTypeChange = (type: AssetType | null) => {
    onFilterChange(type, localSearchQuery, sortBy, sortDesc);
  };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    // If selecting the same sort field, toggle direction
    const newDirection = sort === sortBy ? !sortDesc : true;
    onFilterChange(assetType, localSearchQuery, sort, newDirection);
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <button type="submit" className="sr-only">
              Search
            </button>
          </div>
        </form>

        {/* Asset Type Filter Toggle */}
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center px-3 py-2 border rounded-md hover:bg-gray-50"
        >
          <FunnelIcon className="h-5 w-5 mr-2 text-gray-500" />
          <span>Filter{assetType ? `: ${assetType}` : ''}</span>
        </button>

        {/* Sort Options */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleSortChange('created_at')}
            className={`flex items-center px-3 py-2 border rounded-md hover:bg-gray-50 ${
              sortBy === 'created_at' ? 'bg-blue-50 border-blue-200' : ''
            }`}
          >
            <span>Date</span>
            {sortBy === 'created_at' && (
              sortDesc ? 
                <ArrowDownIcon className="h-4 w-4 ml-1" /> : 
                <ArrowUpIcon className="h-4 w-4 ml-1" />
            )}
          </button>
          
          <button
            onClick={() => handleSortChange('title')}
            className={`flex items-center px-3 py-2 border rounded-md hover:bg-gray-50 ${
              sortBy === 'title' ? 'bg-blue-50 border-blue-200' : ''
            }`}
          >
            <span>Name</span>
            {sortBy === 'title' && (
              sortDesc ? 
                <ArrowDownIcon className="h-4 w-4 ml-1" /> : 
                <ArrowUpIcon className="h-4 w-4 ml-1" />
            )}
          </button>
          
          <button
            onClick={() => handleSortChange('file_size')}
            className={`flex items-center px-3 py-2 border rounded-md hover:bg-gray-50 ${
              sortBy === 'file_size' ? 'bg-blue-50 border-blue-200' : ''
            }`}
          >
            <span>Size</span>
            {sortBy === 'file_size' && (
              sortDesc ? 
                <ArrowDownIcon className="h-4 w-4 ml-1" /> : 
                <ArrowUpIcon className="h-4 w-4 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Filter Options */}
      {filterOpen && (
        <div className="mt-3 pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">Asset Type:</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAssetTypeChange(null)}
              className={`px-3 py-1 text-sm rounded-full ${
                assetType === null
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.values(AssetType).map((type) => (
              <button
                key={type}
                onClick={() => handleAssetTypeChange(type)}
                className={`px-3 py-1 text-sm rounded-full ${
                  assetType === type
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetFilterBar;
