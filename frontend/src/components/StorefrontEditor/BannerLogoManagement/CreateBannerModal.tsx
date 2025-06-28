import { XMarkIcon, ExclamationTriangleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

import type { InputChangeEvent, UUID } from '@/modules/core/models';

import { createBanner, getAssets } from '@/lib/api/storefrontEditor';
import type { Asset } from '@/modules/storefront/models/asset';
import type { CreateBannerRequest } from '@/modules/storefront/models/banner';
// Use Asset type from the lib API until full migration is complete

interface CreateBannerModalProps {
  tenantId: UUID;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBannerModal: React.FC<CreateBannerModalProps> = ({ tenantId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateBannerRequest & { asset_id: string }>({
    title: '',
    content: {},
    start_date: '',
    end_date: '',
    asset_id: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(true);

  // Load assets for selection
  useEffect(() => {
    const loadAssets = async () => {
      setLoadingAssets(true);
      try {
        const response = await getAssets(tenantId, { asset_type: 'image', limit: 50 });
        setAssetList(response.data.assets);
      } catch (err) {
        console.error('Error loading assets:', err);
        setError('Failed to load assets. Please try refreshing.');
      } finally {
        setLoadingAssets(false);
      }
    };

    loadAssets();
  }, [tenantId]);

  // Handle input changes
  const handleInputChange = (e: InputChangeEvent): void => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!formData.title) {
      setError('Banner title is required');
      return;
    }

    if (!formData.asset_id) {
      setError('Please select an image for the banner');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // asset_id is not part of the backend DTO, so include it in content
      const payload: CreateBannerRequest = {
        ...formData,
        content: {
          ...formData.content,
          asset_id: formData.asset_id,
        },
      };
      await createBanner(tenantId, payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating banner:', err);
      setError('Failed to create banner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get the selected asset details
  const selectedAsset = assetList.find((asset) => asset.id === formData.asset_id);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">Create New Banner</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Banner Title *
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

            <div>
              <label htmlFor="asset_id" className="block text-sm font-medium text-gray-700">
                Banner Image *
              </label>

              {loadingAssets ? (
                <div className="mt-1 p-4 flex justify-center items-center border border-gray-300 border-dashed rounded-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700" />
                </div>
              ) : assetList.length === 0 ? (
                <div className="mt-1 p-4 flex flex-col items-center justify-center border border-gray-300 border-dashed rounded-md">
                  <PhotoIcon className="h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No images available</p>
                  <p className="text-xs text-gray-500">
                    Please upload images in the Asset Management section
                  </p>
                </div>
              ) : (
                <>
                  <select
                    id="asset_id"
                    name="asset_id"
                    value={formData.asset_id}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select an image</option>
                    {assetList.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.title}
                      </option>
                    ))}
                  </select>

                  {/* Preview selected image */}
                  {selectedAsset ? (
                    <div className="mt-2 p-2 border rounded-md">
                      <img
                        src={`/api/assets/${selectedAsset.file_path.replace(/^.*[/]/, '')}`}
                        alt={selectedAsset.title}
                        className="max-h-32 max-w-full object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="mt-2 p-4 flex justify-center items-center border border-gray-300 border-dashed rounded-md">
                      <span className="text-sm text-gray-500">Select an image to preview</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={formData.start_date || undefined}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.title || !formData.asset_id}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Banner'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBannerModal;
