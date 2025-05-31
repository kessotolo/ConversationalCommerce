import React, { FC, useState, useEffect } from 'react';
// Removed self-import

import { Upload } from 'lucide-react';import * as React from 'react';

import { getAssets } from '../../../lib/api/StorefrontEditor';
import { Asset, UUID, AssetType } from '../../../types/StorefrontEditor';
import AssetGrid from './AssetGrid';
import AssetUploader from './AssetUploader';
import AssetFilterBar from './AssetFilterBar';
import AssetDetails from './AssetDetails';
import { PlusIcon } from '@heroicons/react/24/outline';

interface AssetManagementProps {
  tenantId: UUID;
}

const AssetManagement: React.FC<AssetManagementProps> = ({ tenantId }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  
  // Filters
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

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
        limit,
        offset
      };
      
      const response = await getAssets(tenantId, params);
      setAssets(response.items);
      setTotalAssets(response.total);
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
  }, [tenantId, assetType, searchQuery, sortBy, sortDesc, limit, offset]);

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
    type: AssetType | null,
    query: string,
    sort: string,
    direction: boolean
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              <AssetGrid 
                assets={assets} 
                onAssetSelect={handleAssetSelect}
                selectedAssetId={selectedAsset?.id}
              />
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700">
                  Showing {offset + 1} to {Math.min(offset + assets.length, totalAssets)} of {totalAssets} assets
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(Math.max(0, offset - limit))}
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
                    onClick={() => handlePageChange(offset + limit)}
                    disabled={offset + limit >= totalAssets}
                    className={`px-3 py-1 rounded ${
                      offset + limit >= totalAssets
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
