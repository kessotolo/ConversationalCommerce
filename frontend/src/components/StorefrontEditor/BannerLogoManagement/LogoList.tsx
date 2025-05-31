import { FC, FormEvent } from 'react';// Removed self-importimport * as React from 'react';
// Removed self-import
import { List } from '@mui/material';import { LogoListProps } from '@/components/StorefrontEditor/BannerLogoManagement/LogoList';import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import { Logo, UUID, LogoStatus, LogoType } from '../../../types/StorefrontEditor';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon 
} from '@heroicons/react/24/outline';

interface LogoListProps {
  logos: Logo[];
  loading: boolean;
  selectedLogoId?: UUID;
  onLogoSelect: (logo: Logo) => void;
  onFilterChange: (status: LogoStatus | 'all', type: LogoType | 'all', query: string) => void;
  statusFilter: LogoStatus | 'all';
  typeFilter: LogoType | 'all';
  searchQuery: string;
}

const LogoList: React.FC<LogoListProps> = ({ 
  logos, 
  loading, 
  selectedLogoId, 
  onLogoSelect,
  onFilterChange,
  statusFilter,
  typeFilter,
  searchQuery
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(statusFilter, typeFilter, localSearchQuery);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setLocalSearchQuery('');
    onFilterChange('all', 'all', '');
  };

  // Format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: LogoStatus): string => {
    switch (status) {
      case LogoStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case LogoStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case LogoStatus.INACTIVE:
        return 'bg-red-100 text-red-800';
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
    <div className="flex-1 flex flex-col">
      {/* Filter Bar */}
      <div className="p-3 border-b">
        <form onSubmit={handleSearch} className="mb-2">
          <div className="relative">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search logos..."
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
            Filters {(statusFilter !== 'all' || typeFilter !== 'all') && '(Active)'}
          </button>
          
          {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
        
        {/* Expanded Filters */}
        {filterOpen && (
          <div className="mt-3 pt-3 border-t space-y-4">
            {/* Status Filter */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onFilterChange('all', typeFilter, localSearchQuery)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    statusFilter === 'all' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {Object.values(LogoStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => onFilterChange(status, typeFilter, localSearchQuery)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      statusFilter === status 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Logo Type Filter */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Logo Type</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onFilterChange(statusFilter, 'all', localSearchQuery)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    typeFilter === 'all' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  All Types
                </button>
                {Object.values(LogoType).map((type) => (
                  <button
                    key={type}
                    onClick={() => onFilterChange(statusFilter, type, localSearchQuery)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      typeFilter === type 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logo List */}
      <div className="flex-1 overflow-y-auto">
        {logos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No logos found.</p>
            {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {logos.map((logo) => (
              <div
                key={logo.id}
                onClick={() => onLogoSelect(logo)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedLogoId === logo.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start">
                  {/* Logo thumbnail */}
                  <div className="w-16 h-16 mr-3 bg-gray-100 rounded flex items-center justify-center border overflow-hidden">
                    <img
                      src={`/api/assets/${logo.asset_id}`}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xOC45NTMxIDIzLjA5MzhDMjAuMDYyNSAyMy4wOTM4IDIwLjk3NjYgMjIuMTc5NyAyMC45NzY2IDIxLjA3MDNDMjAuOTc2NiAxOS45NjA5IDIwLjA2MjUgMTkuMDQ2OSAxOC45NTMxIDE5LjA0NjlDMTcuODQzOCAxOS4wNDY5IDE2LjkyOTcgMTkuOTYwOSAxNi45Mjk3IDIxLjA3MDNDMTYuOTI5NyAyMi4xNzk3IDE3Ljg0MzggMjMuMDkzOCAxOC45NTMxIDIzLjA5MzhaIiBmaWxsPSIjOTRBM0IzIi8+CjxwYXRoIGQ9Ik0zMy4wMDc4IDMwLjk3NjZDMzMuMDA3OCAzMC40Njg4IDMyLjU5MzggMzAuMDU0NyAzMi4wODU5IDMwLjA1NDdIMTcuOTE0MUMxNy40MDYyIDMwLjA1NDcgMTYuOTkyMiAzMC40Njg4IDE2Ljk5MjIgMzAuOTc2NkMxNi45OTIyIDMxLjQ4NDQgMTcuNDA2MiAzMS44OTg0IDE3LjkxNDEgMzEuODk4NEgzMi4wODU5QzMyLjU5MzggMzEuODk4NCAzMy4wMDc4IDMxLjQ4NDQgMzMuMDA3OCAzMC45NzY2WiIgZmlsbD0iIzk0QTNCMyIvPgo8cGF0aCBkPSJNMzYuMzI4MSAyNS44MjAzQzM2LjMyODEgMjUuNDYwOSAzNi4wOTM4IDI1LjEyNSAzNS43MzQ0IDI0Ljk2MDlDMzUuMzcgMjQuODIwMyAzNC45NjQ4IDI0Ljg1OTQgMzQuNjQwNiAyNS4xMTcyTDMxLjMyODEgMjcuNzUzOUwyNi43NSAyMS41MTE3QzI2LjQ4NDQgMjEuMTU2MiAyNS45OTIyIDIxLjA3ODEgMjUuNjM2NyAyMS4zNDM4TDE4LjA3MDMgMjcuMTE3MkwxNS4yODkxIDI0LjgzNTlDMTQuOTQ1MyAyNC41NTQ3IDE0LjQ1MzEgMjQuNTM1MiAxNC4wODk4IDI0Ljc4MTJDMTMuNzI2NiAyNS4wMjczIDEzLjU1ODYgMjUuNDg0NCAxMy42OTkyIDI1Ljg5ODRMMTYuMTg3NSAzMy4yMzQ0QzE2LjI4OTEgMzMuNTI3MyAxNi41MzUyIDMzLjc1MzkgMTYuODMyIDMzLjgyODFDMTYuODk0NSAzMy44NDM4IDE2Ljk1NzAgMzMuODQ3NyAxNy4wMTk1IDMzLjg0NzdDMTcuMjU3OCAzMy44NDc3IDE3LjQ4ODMgMzMuNzYxNyAxNy42NjQxIDMzLjYwMTZMMjUuNzM0NCAyNi4zMzU5TDMwLjMyODEgMzIuNTk3N0MzMC41MzEyIDMyLjg2MzMgMzAuODQzOCAzMy4wMDc4IDMxLjE3MTkgMzMuMDA3OEMzMS4zNjMzIDMzLjAwNzggMzEuNTU4NiAzMi45NTMxIDMxLjcyNjYgMzIuODI4MUwzNS45MTQxIDI5LjU3MDNDMzYuMTc5NyAyOS4zNzExIDM2LjMyODEgMjkuMDU0NyAzNi4zMjgxIDI4LjcxODhWMjUuODIwM1oiIGZpbGw9IiM5NEEzQjMiLz4KPC9zdmc+Cg==';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-gray-900 truncate" title={logo.name}>
                        {logo.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(logo.status)}`}
                      >
                        {logo.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      <span className="capitalize mr-2">Type: {logo.logo_type}</span>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <div>
                        {logo.start_date && (
                          <span className="mr-2">From: {formatDate(logo.start_date)}</span>
                        )}
                        {logo.end_date && (
                          <span>To: {formatDate(logo.end_date)}</span>
                        )}
                      </div>
                      
                      {/* Active indicator */}
                      {logo.status === LogoStatus.PUBLISHED && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoList;
