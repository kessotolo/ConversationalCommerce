import React, { FC, FormEvent } from 'react';


// Removed self-import
// Removed self-importimport * as React from 'react';
import { List } from '@mui/material';import { BannerItem, BannerItemProps, BannerListProps } from '@/components/StorefrontEditor/BannerLogoManagement/BannerList';import { Bars3Icon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
// Removed circular import;
import { Search } from 'lucide-react';
import { Banner, UUID, BannerStatus, BannerType } from '../../../types/StorefrontEditor';
import { useDrag, useDrop } from 'react-dnd';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  Bars3Icon 
} from '@heroicons/react/24/outline';

// Item type for drag and drop
const BANNER_ITEM = 'banner';

// DnD item interface
interface DragItem {
  index: number;
  id: UUID;
  type: string;
}

interface BannerItemProps {
  banner: Banner;
  index: number;
  selectedBannerId?: UUID;
  onBannerSelect: (banner: Banner) => void;
  onBannerReorder: (sourceIndex: number, destinationIndex: number) => Promise<boolean>;
}

// Draggable Banner Item Component
const BannerItem: React.FC<BannerItemProps> = ({ 
  banner, 
  index, 
  selectedBannerId, 
  onBannerSelect,
  onBannerReorder
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  
  // Setup drag
  const [{ isDragging }, drag] = useDrag({
    type: BANNER_ITEM,
    item: { index, id: banner.id, type: BANNER_ITEM } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  // Setup drop
  const [, drop] = useDrop({
    accept: BANNER_ITEM,
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;
      
      // Only perform the move when the mouse has crossed half of the item's height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      // Time to actually perform the action
      item.index = hoverIndex;
    },
    drop: (item: DragItem) => {
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      
      onBannerReorder(dragIndex, hoverIndex);
    },
  });
  
  // Initialize drag and drop
  drag(drop(ref));
  
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
  const getStatusBadgeClass = (status: BannerStatus): string => {
    switch (status) {
      case BannerStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case BannerStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case BannerStatus.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      case BannerStatus.INACTIVE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Determine if banner is active (current date between start and end dates)
  const isActive = (): boolean => {
    const now = new Date();
    const startDate = banner.start_date ? new Date(banner.start_date) : null;
    const endDate = banner.end_date ? new Date(banner.end_date) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  };
  
  return (
    <div
      ref={ref}
      onClick={() => onBannerSelect(banner)}
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b relative ${
        selectedBannerId === banner.id ? 'bg-blue-50' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      data-index={index}
    >
      <div className="flex items-start">
        <div className="mr-3 mt-1 cursor-move text-gray-400 hover:text-gray-700">
          <Bars3Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium text-gray-900 truncate" title={banner.title}>
              {banner.title}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(banner.status)}`}
            >
              {banner.status}
            </span>
          </div>
          
          <div className="text-xs text-gray-500 mb-2">
            <span className="capitalize mr-2">Type: {banner.banner_type}</span>
            {banner.display_order !== undefined && (
              <span className="mr-2">Order: {banner.display_order}</span>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <div>
              {banner.start_date && (
                <span className="mr-2">From: {formatDate(banner.start_date)}</span>
              )}
              {banner.end_date && (
                <span>To: {formatDate(banner.end_date)}</span>
              )}
            </div>
            
            {/* Active indicator */}
            {isActive() && banner.status === BannerStatus.PUBLISHED && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface BannerListProps {
  banners: Banner[];
  loading: boolean;
  selectedBannerId?: UUID;
  onBannerSelect: (banner: Banner) => void;
  onBannerReorder: (sourceIndex: number, destinationIndex: number) => Promise<boolean>;
  onFilterChange: (status: BannerStatus | 'all', type: BannerType | 'all', query: string) => void;
  statusFilter: BannerStatus | 'all';
  typeFilter: BannerType | 'all';
  searchQuery: string;
}

const BannerList: React.FC<BannerListProps> = ({ 
  banners, 
  loading, 
  selectedBannerId, 
  onBannerSelect,
  onBannerReorder,
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
              placeholder="Search banners..."
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
                {Object.values(BannerStatus).map((status) => (
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
            
            {/* Banner Type Filter */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Banner Type</h4>
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
                {Object.values(BannerType).map((type) => (
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

      {/* Banner List */}
      <div className="flex-1 overflow-y-auto">
        {banners.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No banners found.</p>
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
          <div>
            {banners.map((banner, index) => (
              <BannerItem
                key={banner.id}
                banner={banner}
                index={index}
                selectedBannerId={selectedBannerId}
                onBannerSelect={onBannerSelect}
                onBannerReorder={onBannerReorder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerList;
