import React, { ChangeEvent, FC, FormEvent } from 'react';


// Removed self-import// Removed self-import

import { CheckCircleIcon } from '@heroicons/react/24/outline';import { ArrowTopRightOnSquareIcon, BoltIcon, DocumentIcon, DocumentTextIcon, FilmIcon, MusicalNoteIcon, PencilIcon, PhotoIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Check, Save } from 'lucide-react';
import { Asset, UUID, AssetType } from '../../../types/StorefrontEditor';
import { updateAsset, deleteAsset, optimizeAsset } from '../../../lib/api/StorefrontEditor';
import { 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon, 
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckCircleIcon,
  PhotoIcon,
  FilmIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

interface AssetDetailsProps {
  asset: Asset;
  tenantId: UUID;
  onUpdate: () => void;
  onClose: () => void;
}

const AssetDetails: React.FC<AssetDetailsProps> = ({ asset, tenantId, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [formData, setFormData] = useState({
    title: asset.title,
    alt_text: asset.alt_text || '',
    description: asset.description || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get asset icon based on type
  const getAssetIcon = (assetType: AssetType) => {
    switch (assetType) {
      case AssetType.IMAGE:
        return <PhotoIcon className="h-6 w-6 text-blue-500" />;
      case AssetType.VIDEO:
        return <FilmIcon className="h-6 w-6 text-purple-500" />;
      case AssetType.DOCUMENT:
        return <DocumentTextIcon className="h-6 w-6 text-yellow-500" />;
      case AssetType.AUDIO:
        return <MusicalNoteIcon className="h-6 w-6 text-green-500" />;
      default:
        return <DocumentIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await updateAsset(tenantId, asset.id, formData);
      setSuccessMessage('Asset updated successfully');
      setIsEditing(false);
      onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update asset');
      console.error('Error updating asset:', err);
    }
  };

  // Handle asset optimization
  const handleOptimize = async () => {
    if (asset.is_optimized) return;
    
    setIsOptimizing(true);
    setError(null);
    
    try {
      await optimizeAsset(tenantId, asset.id);
      setSuccessMessage('Asset optimized successfully');
      onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to optimize asset');
      console.error('Error optimizing asset:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle asset deletion
  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }
    
    setError(null);
    
    try {
      await deleteAsset(tenantId, asset.id);
      onUpdate();
      onClose();
    } catch (err) {
      setError('Failed to delete asset');
      console.error('Error deleting asset:', err);
      setIsDeleting(false);
    }
  };

  // Cancel deletion
  const cancelDelete = () => {
    setIsDeleting(false);
  };

  // Check if asset is an image
  const isImage = asset.asset_type === AssetType.IMAGE;

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-medium flex items-center">
          {getAssetIcon(asset.asset_type)}
          <span className="ml-2">Asset Details</span>
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Asset Preview */}
      <div className="p-4 border-b flex justify-center bg-gray-50">
        {isImage ? (
          <img
            src={`/api/assets/${asset.file_path.replace(/^.*[\\\/]/, '')}`}
            alt={asset.title}
            className="max-h-48 max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            {getAssetIcon(asset.asset_type)}
            <span className="mt-2 text-sm text-gray-500">{asset.original_filename}</span>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="m-4 p-2 bg-green-100 text-green-800 rounded-md flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="m-4 p-2 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              {isImage && (
                <div>
                  <label htmlFor="alt_text" className="block text-sm font-medium text-gray-700">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    id="alt_text"
                    name="alt_text"
                    value={formData.alt_text}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Asset Information */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Filename</dt>
                <dd className="mt-1 text-sm text-gray-900 break-all">{asset.original_filename}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{asset.asset_type}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Size</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatFileSize(asset.file_size)}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(asset.created_at)}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(asset.updated_at)}</dd>
              </div>
              
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Title</dt>
                <dd className="mt-1 text-sm text-gray-900">{asset.title}</dd>
              </div>
              
              {asset.alt_text && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Alt Text</dt>
                  <dd className="mt-1 text-sm text-gray-900">{asset.alt_text}</dd>
                </div>
              )}
              
              {asset.description && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{asset.description}</dd>
                </div>
              )}
              
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Used In</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {asset.usage_count ? `${asset.usage_count} places` : 'Not used'}
                </dd>
              </div>
            </dl>
            
            {/* Optimization Status */}
            {isImage && (
              <div className={`p-3 rounded-md ${asset.is_optimized ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex">
                  {asset.is_optimized ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Optimized</h3>
                        <div className="mt-1 text-xs text-green-700">
                          This image has been optimized for web use.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <BoltIcon className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Not Optimized</h3>
                        <div className="mt-1 text-xs text-yellow-700">
                          Optimize this image to improve page load times.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="p-4 border-t">
          {isDeleting ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600 font-medium">Are you sure you want to delete this asset?</p>
              {asset.usage_count > 0 && (
                <p className="text-xs text-red-600">
                  Warning: This asset is used in {asset.usage_count} places. Deleting it may break those references.
                </p>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 text-sm text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
              
              <a
                href={`/api/assets/${asset.file_path.replace(/^.*[\\\/]/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                View
              </a>
              
              {isImage && !asset.is_optimized && (
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  className="inline-flex items-center px-3 py-2 border border-indigo-600 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  <BoltIcon className="h-4 w-4 mr-2" />
                  {isOptimizing ? 'Optimizing...' : 'Optimize'}
                </button>
              )}
              
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetDetails;
