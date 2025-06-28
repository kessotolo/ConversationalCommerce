import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import type { UUID } from '@/modules/core/models/base';

import BannerDetail from '@/components/StorefrontEditor/BannerLogoManagement/BannerDetail';
import BannerList from '@/components/StorefrontEditor/BannerLogoManagement/BannerList';
import CreateBannerModal from '@/components/StorefrontEditor/BannerLogoManagement/CreateBannerModal';
import {
  getBanners,
  publishBanner,
  deleteBanner,
  reorderBanners,
} from '@/lib/api/storefrontEditor';
import type { Banner } from '@/modules/storefront/models/banner';

interface BannerManagementProps {
  tenantId: UUID;
}

const BannerManagement: React.FC<BannerManagementProps> = ({ tenantId }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [totalBanners, setTotalBanners] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const [limit] = useState<number>(20);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<Banner['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load banners
  const loadBanners = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = { offset, limit };

      // Add filters if set
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await getBanners(tenantId, params);
      setBanners(response.data.banners);
      setTotalBanners(response.data.total);

      // Select first banner if nothing is selected
      if (response.data.banners.length > 0 && !selectedBanner) {
        const firstBanner = response.data.banners[0];
        if (firstBanner) {
          setSelectedBanner(firstBanner);
        }
      }
    } catch (err) {
      setError('Failed to load banners. Please try again later.');
      console.error('Error loading banners:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load banners on initial render and when filters change
  useEffect(() => {
    loadBanners();
  }, [tenantId, offset, limit, statusFilter, typeFilter, searchQuery]);

  // Handle publishing a banner
  const handlePublishBanner = async (bannerId: UUID) => {
    try {
      await publishBanner(tenantId, bannerId);
      setSuccessMessage('Banner published successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadBanners();
      return true;
    } catch (err) {
      setError('Failed to publish banner');
      setTimeout(() => setError(null), 3000);
      console.error('Error publishing banner:', err);
      return false;
    }
  };

  // Handle deleting a banner
  const handleDeleteBanner = async (bannerId: UUID) => {
    try {
      await deleteBanner(tenantId, bannerId);

      // If the deleted banner was selected, clear selection
      if (selectedBanner && selectedBanner.id === bannerId) {
        setSelectedBanner(null);
      }

      setSuccessMessage('Banner deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadBanners();
      return true;
    } catch (err) {
      setError('Failed to delete banner');
      setTimeout(() => setError(null), 3000);
      console.error('Error deleting banner:', err);
      return false;
    }
  };

  // Handle banner reordering
  const handleBannerReorder = async (sourceIndex: number, destinationIndex: number) => {
    const reordered = [...banners];
    const [removed] = reordered.splice(sourceIndex, 1);
    // Ensure removed is defined before splicing it back
    if (removed) {
      reordered.splice(destinationIndex, 0, removed);
    }
    const updatedOrder = reordered.map((banner) => banner.id);
    try {
      setBanners(reordered);
      await reorderBanners(tenantId, { order: updatedOrder });
      setSuccessMessage('Banner order updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      return true;
    } catch (err) {
      setError('Failed to update banner order');
      setTimeout(() => setError(null), 3000);
      console.error('Error reordering banners:', err);
      loadBanners();
      return false;
    }
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
  };

  // Apply filters
  const handleFilterChange = (
    status: Banner['status'] | 'all',
    type: string | 'all',
    query: string,
  ) => {
    setStatusFilter(status);
    setTypeFilter(type);
    setSearchQuery(query);
    setOffset(0); // Reset pagination when filters change
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-xl font-medium">Banners</h3>
          <button
            onClick={loadBanners}
            className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Banner
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">{successMessage}</div>
      )}

      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

      <div className="flex-1 flex gap-6">
        {/* Banner List with drag and drop for reordering */}
        <DndProvider backend={HTML5Backend}>
          <div className="w-1/2 bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
            <BannerList
              banners={banners}
              loading={loading}
              selectedBannerId={selectedBanner?.id}
              onBannerSelect={(banner) => banner && setSelectedBanner(banner)}
              onBannerReorder={handleBannerReorder}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              searchQuery={searchQuery}
              onFilterChange={handleFilterChange}
            />

            {/* Pagination */}
            {banners.length > 0 && (
              <div className="p-3 border-t mt-auto">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Showing {offset + 1}-{Math.min(offset + banners.length, totalBanners)} of{' '}
                    {totalBanners}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                      className={`px-3 py-1 rounded text-sm ${
                        offset === 0
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(offset + limit)}
                      disabled={offset + limit >= totalBanners}
                      className={`px-3 py-1 rounded text-sm ${
                        offset + limit >= totalBanners
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DndProvider>

        {/* Banner Detail */}
        <div className="w-1/2">
          {selectedBanner ? (
            <BannerDetail
              banner={selectedBanner}
              tenantId={tenantId}
              onPublish={handlePublishBanner}
              onDelete={handleDeleteBanner}
              onUpdate={loadBanners}
            />
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 flex flex-col items-center justify-center h-full">
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No banner selected</h3>
              <p className="text-gray-500 mt-1">
                Select a banner to view details or create a new one.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Banner
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Banner Modal */}
      {isCreateModalOpen && (
        <CreateBannerModal
          tenantId={tenantId}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={loadBanners}
        />
      )}
    </div>
  );
};

export default BannerManagement;
