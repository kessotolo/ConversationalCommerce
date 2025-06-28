import { PlusIcon } from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

import AssetDetails from '@/components/StorefrontEditor/AssetManagement/AssetDetails';
import AssetFilterBar from '@/components/StorefrontEditor/AssetManagement/AssetFilterBar';
import AssetGrid from '@/components/StorefrontEditor/AssetManagement/AssetGrid';
import AssetUploader from '@/components/StorefrontEditor/AssetManagement/AssetUploader';
import { getAssets } from '@/lib/api/storefrontEditor';
import type { Asset } from '@/modules/storefront/models/asset';
interface AssetManagementProps {
  tenantId: string;
}

const AssetManagement: React.FC<AssetManagementProps> = ({ tenantId }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);

  // Filters
  const [assetType, setAssetType] = useState<'image' | 'video' | 'audio' | 'document' | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);

  // Load assets
  const loadAssets = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        asset_type: assetType,
        search_query: searchQuery || undefined,
        sort_by: sortBy,
        sort_desc: sortDesc,
        offset,
      };

      const response = await getAssets(tenantId, params);
      setAssets(response.data.assets);
    } catch (err) {
      setError('Failed to load assets. Please try again later.');
      console.error('Error loading assets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load assets on initial load and when filters change
  useEffect(() => {
    loadAssets();
  }, [tenantId, assetType, searchQuery, sortBy, sortDesc, offset]);

  // Handle asset selection
  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  // Handle asset refresh after operations
  const handleAssetRefresh = () => {
    loadAssets();
    setSelectedAsset(null);
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
  };

  // Handle filter changes
  const handleFilterChange = (
    type: 'image' | 'video' | 'audio' | 'document' | null,
    query: string,
    sort: string,
    direction: boolean,
  ) => {
    setAssetType(type);
    setSearchQuery(query);
    setSortBy(sort);
    setSortDesc(direction);
    setOffset(0); // Reset to first page when filters change
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Asset Management</h2>
        <button
          onClick={() => setIsUploaderOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Upload Assets
        </button>
      </div>

      <AssetFilterBar
        assetType={assetType}
        searchQuery={searchQuery}
        sortBy={sortBy}
        sortDesc={sortDesc}
        onFilterChange={handleFilterChange}
      />

      <div className="flex flex-1 gap-4 mt-4">
        <div className={`${selectedAsset ? 'w-2/3' : 'w-full'} overflow-hidden`}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              <AssetGrid
                assets={assets}
                selectedAssetId={selectedAsset?.id}
                onAssetSelect={handleAssetSelect}
              />

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700">
                  Showing {offset + 1} to {Math.min(offset + assets.length, assets.length)} of{' '}
                  {assets.length} assets
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(Math.max(0, offset - 20))}
                    disabled={offset === 0}
                    className={`px-3 py-1 rounded ${
                      offset === 0
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(offset + 20)}
                    disabled={offset + 20 >= assets.length}
                    className={`px-3 py-1 rounded ${
                      offset + 20 >= assets.length
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedAsset && (
          <div className="w-1/3">
            <AssetDetails
              asset={selectedAsset}
              tenantId={tenantId}
              onUpdate={handleAssetRefresh}
              onClose={() => setSelectedAsset(null)}
            />
          </div>
        )}
      </div>

      {/* Asset Uploader Modal */}
      {isUploaderOpen && (
        <AssetUploader
          tenantId={tenantId}
          onClose={() => setIsUploaderOpen(false)}
          onSuccess={handleAssetRefresh}
        />
      )}
    </div>
  );
};

export default AssetManagement;
