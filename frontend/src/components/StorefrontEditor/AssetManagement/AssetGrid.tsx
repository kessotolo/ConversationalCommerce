import React from 'react';
import { Asset, UUID, AssetType } from '../../../types/storefrontEditor';
import { DocumentIcon, PhotoIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface AssetGridProps {
  assets: Asset[];
  onAssetSelect: (asset: Asset) => void;
  selectedAssetId?: UUID;
}

const AssetGrid: React.FC<AssetGridProps> = ({ assets, onAssetSelect, selectedAssetId }) => {
  // Get appropriate icon based on asset type
  const getAssetIcon = (assetType: AssetType) => {
    switch (assetType) {
      case AssetType.IMAGE:
        return <PhotoIcon className="h-8 w-8 text-blue-500" />;
      case AssetType.VIDEO:
        return <FilmIcon className="h-8 w-8 text-purple-500" />;
      case AssetType.DOCUMENT:
        return <DocumentTextIcon className="h-8 w-8 text-yellow-500" />;
      case AssetType.AUDIO:
        return <MusicalNoteIcon className="h-8 w-8 text-green-500" />;
      default:
        return <DocumentIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Generate preview URL for the asset
  const getAssetPreviewUrl = (asset: Asset): string => {
    // This is a placeholder. In a real implementation, you would use the actual CDN or API URL
    // that serves optimized thumbnails of assets
    if (asset.asset_type === AssetType.IMAGE) {
      // For optimized images, check if there's a small thumbnail version
      if (asset.is_optimized && asset.metadata?.optimized_versions?.["200x200"]) {
        return `/api/assets/${asset.file_path.replace(/^.*[\\\/]/, '')}`;
      }
      return `/api/assets/${asset.file_path.replace(/^.*[\\\/]/, '')}`;
    }
    
    return '';
  };

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8">
        <DocumentIcon className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No assets found</h3>
        <p className="text-gray-500 mt-1">Upload assets to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          onClick={() => onAssetSelect(asset)}
          className={`group relative flex flex-col border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedAssetId === asset.id
              ? 'ring-2 ring-blue-500 shadow-md'
              : 'hover:border-blue-300'
          }`}
        >
          {/* Asset Preview */}
          <div className="h-32 flex items-center justify-center bg-gray-100 border-b">
            {asset.asset_type === AssetType.IMAGE ? (
              <img
                src={getAssetPreviewUrl(asset)}
                alt={asset.title}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.appendChild(
                    getAssetIcon(asset.asset_type) as unknown as Node
                  );
                }}
              />
            ) : (
              getAssetIcon(asset.asset_type)
            )}
          </div>

          {/* Asset Info */}
          <div className="p-2 flex-1 flex flex-col">
            <h3 className="text-sm font-medium text-gray-900 truncate" title={asset.title}>
              {asset.title}
            </h3>
            <p className="text-xs text-gray-500 truncate" title={asset.original_filename}>
              {asset.original_filename}
            </p>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{formatFileSize(asset.file_size)}</span>
              <span className="capitalize">{asset.asset_type}</span>
            </div>
          </div>

          {/* Optimized badge */}
          {asset.is_optimized && (
            <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              Optimized
            </div>
          )}

          {/* Usage count badge */}
          {asset.usage_count > 0 && (
            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              Used: {asset.usage_count}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AssetGrid;
