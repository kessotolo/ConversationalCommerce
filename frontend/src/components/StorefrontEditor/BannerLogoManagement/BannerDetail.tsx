import {
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  PhotoIcon,
  LinkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

import type { InputChangeEvent, FormSubmitEvent } from '@/modules/core/models';
import type { UUID } from '@/modules/core/models/base';

import { updateBanner, getAssets } from '@/lib/api/storefrontEditor';
import type { Asset } from '@/modules/storefront/models/asset';
import type { Banner } from '@/modules/storefront/models/banner';
import { TargetAudience, BannerStatus } from '@/modules/storefront/models/banner';

interface BannerDetailProps {
  banner: Banner;
  tenantId: UUID;
  onPublish: (bannerId: UUID) => Promise<boolean>;
  onDelete: (bannerId: UUID) => Promise<boolean>;
  onUpdate: () => void;
}

const BannerDetail: React.FC<BannerDetailProps> = ({
  banner,
  tenantId,
  onPublish,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [assetId, setAssetId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    start_date: string;
    end_date: string;
    target_audience: TargetAudience[];
    link_url?: string;
  }>({
    title: banner.title,
    start_date: banner.start_date || '',
    end_date: banner.end_date || '',
    target_audience: banner.target_audience || [],
    link_url: banner.link_url || '',
  });

  // Load assets for selection
  useEffect(() => {
    const loadAssets = async () => {
      if (isEditing) {
        setLoadingAssets(true);
        try {
          const response = await getAssets(tenantId, { asset_type: 'image', limit: 50 });
          setAssetList(response.data.assets);
        } catch (err) {
          console.error('Error loading assets:', err);
        } finally {
          setLoadingAssets(false);
        }
      }
    };

    loadAssets();
  }, [isEditing, tenantId]);

  // Format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  // Format date for input
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return '';
    // Ensure we have a string to split
    return dateString.split('T')[0] || '';
  };

  // Handle input changes
  const handleInputChange = (e: InputChangeEvent) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle target audience change
  const handleTargetAudienceChange = (audience: TargetAudience) => {
    setFormData((prev) => {
      const exists = prev.target_audience.includes(audience);
      return {
        ...prev,
        target_audience: exists
          ? prev.target_audience.filter((a) => a !== audience)
          : [...prev.target_audience, audience],
      };
    });
  };

  // Handle form submission
  const handleSubmit = async (e: FormSubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateBanner(tenantId, banner.id, formData);
      setSuccessMessage('Banner updated successfully');
      setIsEditing(false);
      onUpdate();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update banner');
      console.error('Error updating banner:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    setLoading(true);
    setError(null);

    try {
      const success = await onPublish(banner.id);

      if (success) {
        setSuccessMessage('Banner published successfully');
      } else {
        setError('Failed to publish banner');
      }
    } catch (err) {
      setError('Failed to publish banner');
      console.error('Error publishing banner:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const success = await onDelete(banner.id);

      if (success) {
        setSuccessMessage('Banner deleted successfully');
      } else {
        setError('Failed to delete banner');
      }
    } catch (err) {
      setError('Failed to delete banner');
      console.error('Error deleting banner:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get the selected asset details
  const selectedAsset = assetList.find((asset) => asset.id === assetId);

  // Check if banner can be published
  const canPublish =
    banner.status === BannerStatus.DRAFT || banner.status === BannerStatus.INACTIVE;

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">Banner Details</h3>
        <div className="flex gap-2">
          {!isEditing && !isDeleting && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>

              {canPublish && (
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 border border-green-600 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Publish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="m-4 p-3 bg-green-100 text-green-800 rounded-md flex items-center">
          <CheckIcon className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="m-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {isDeleting ? (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Delete Confirmation</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Are you sure you want to delete this banner? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        ) : isEditing ? (
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
              <select
                id="asset_id"
                name="asset_id"
                value={assetId}
                onChange={(e) => {
                  setAssetId(e.target.value);
                }}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loadingAssets}
              >
                <option value="">Select an image</option>
                {assetList.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title}
                  </option>
                ))}
              </select>

              {/* Preview selected image */}
              {selectedAsset && (
                <div className="mt-2 p-2 border rounded-md">
                  <img
                    src={`/api/assets/${selectedAsset.file_path.replace(/^.*\//, '')}`}
                    alt={selectedAsset.title}
                    className="max-h-32 max-w-full object-contain mx-auto"
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="link_url" className="block text-sm font-medium text-gray-700">
                Link URL
              </label>
              <input
                type="url"
                id="link_url"
                name="link_url"
                value={formData.link_url}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
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
                  value={formatDateForInput(formData.start_date)}
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
                  value={formatDateForInput(formData.end_date)}
                  onChange={handleInputChange}
                  min={formatDateForInput(formData.start_date)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience
              </label>
              <div className="space-y-2">
                {Object.values(TargetAudience).map((audience) => (
                  <div key={audience} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`audience-${audience}`}
                      checked={formData.target_audience.includes(audience)}
                      onChange={() => handleTargetAudienceChange(audience)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`audience-${audience}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      {audience.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Banner Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Banner Information</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{banner.title}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${banner.status === BannerStatus.DRAFT ? 'bg-gray-100 text-gray-800' : ''}
                          ${banner.status === BannerStatus.PUBLISHED ? 'bg-green-100 text-green-800' : ''}
                          ${banner.status === BannerStatus.INACTIVE ? 'bg-red-100 text-red-800' : ''}
                        `}
                    >
                      {banner.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Banner Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Banner Preview</h4>
              <div className="bg-gray-100 p-2 rounded-md flex justify-center items-center border">
                <div className="h-48 max-w-full flex items-center justify-center">
                  {banner.asset_id ? (
                    <img
                      src={`/api/assets/${banner.asset_id.replace(/^.*\//, '')}`}
                      alt={banner.title}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src =
                          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xOC45NTMxIDIzLjA5MzhDMjAuMDYyNSAyMy4wOTM4IDIwLjk3NjYgMjIuMTc5NyAyMC45NzY2IDIxLjA3MDNDMjAuOTc2NiAxOS45NjA5IDIwLjA2MjUgMTkuMDQ2OSAxOC45NTMxIDE5LjA0NjlDMTcuODQzOCAxOS4wNDY5IDE2LjkyOTcgMTkuOTYwOSAxNi45Mjk3IDIxLjA3MDNDMTYuOTI5NyAyMi4xNzk3IDE3Ljg0MzggMjMuMDkzOCAxOC45NTMxIDIzLjA5MzhaIiBmaWxsPSIjOTRBM0IzIi8+CjxwYXRoIGQ9Ik0zMy4wMDc4IDMwLjk3NjZDMzMuMDA3OCAzMC40Njg4IDMyLjU5MzggMzAuMDU0NyAzMi4wODU5IDMwLjA1NDdIMTcuOTE0MUMxNy40MDYyIDMwLjA1NDcgMTYuOTkyMiAzMC40Njg4IDE2Ljk5MjIgMzAuOTc2NkMxNi45OTIyIDMxLjQ4NDQgMTcuNDA2MiAzMS44OTg0IDE3LjkxNDEgMzEuODk4NEgzMi4wODU5QzMyLjU5MzggMzEuODk4NCAzMy4wMDc4IDMxLjQ4NDQgMzMuMDA3OCAzMC45NzY2WiIgZmlsbD0iIzk0QTNCMyIvPgo8cGF0aCBkPSJNMzYuMzI4MSAyNS44MjAzQzM2LjMyODEgMjUuNDYwOSAzNi4wOTM4IDI1LjEyNSAzNS43MzQ0IDI0Ljk2MDlDMzUuMzcgMjQuODIwMyAzNC45NjQ4IDI0Ljg1OTQgMzQuNjQwNiAyNS4xMTcyTDMxLjMyODEgMjcuNzUzOUwyNi43NSAyMS41MTE3QzI2LjQ4NDQgMjEuMTU2MiAyNS45OTIyIDIxLjA3ODEgMjUuNjM2NyAyMS4zNDM4TDE4LjA3MDMgMjcuMTE3MkwxNS4yODkxIDI0LjgzNTlDMTQuOTQ1MyAyNC41NTQ3IDE0LjQ1MzEgMjQuNTM1MiAxNC4wODk4IDI0Ljc4MTJDMTMuNzI2NiAyNS4wMjczIDEzLjU1ODYgMjUuNDg0NCAxMy42OTkyIDI1Ljg5ODRMMTYuMTg3NSAzMy4yMzQ0QzE2LjI4OTEgMzMuNTI3MyAxNi41MzUyIDMzLjc1MzkgMTYuODMyIDMzLjgyODFDMTYuODk0NSAzMy44NDM4IDE2Ljk1NzAgMzMuODQ3NyAxNy4wMTk1IDMzLjg0NzdDMTcuMjU3OCAzMy44NDc3IDE3LjQ4ODMgMzMuNzYxNyAxNy42NjQxIDMzLjYwMTZMMjUuNzM0NCAyNi4zMzU5TDMwLjMyODEgMzIuNTk3N0MzMC41MzEyIDMyLjg2MzMgMzAuODQzOCAzMy4wMDc4IDMxLjE3MTkgMzMuMDA3OEMzMS4zNjMzIDMzLjAwNzggMzEuNTU4NiAzMi45NTMxIDMxLjcyNjYgMzIuODI4MUwzNS45MTQxIDI5LjU3MDNDMzYuMTc5NyAyOS4zNzExIDM2LjMyODEgMjkuMDU0NyAzNi4zMjgxIDI4LjcxODhWMjUuODIwM1oiIGZpbGw9IiM5NEEzQjMiLz4KPC9zdmc+Cg==';
                      }}
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <PhotoIcon className="h-12 w-12 mb-2" />
                      <span className="text-sm">No image set</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Link Information */}
            <div className="flex items-start">
              <LinkIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-gray-700">Link URL</h4>
                <p className="text-sm text-gray-500 break-all">
                  {banner.link_url || 'No link set'}
                </p>
              </div>
            </div>

            {/* Date Information */}
            <div className="flex items-start">
              <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-gray-700">Schedule</h4>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="text-sm">{formatDate(banner.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="text-sm">{formatDate(banner.end_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="flex items-start">
              <UserGroupIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-gray-700">Target Audience</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {banner.target_audience && banner.target_audience.length > 0 ? (
                    banner.target_audience.map((audience) => (
                      <span
                        key={audience}
                        className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full capitalize"
                      >
                        {audience.replace('_', ' ')}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">All users</span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Metadata</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-1">{formatDate(banner.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Created By:</span>
                  <span className="ml-1">{banner.created_by}</span>
                </div>
                {banner.modified_at && (
                  <div>
                    <span className="text-gray-500">Modified:</span>
                    <span className="ml-1">{formatDate(banner.modified_at)}</span>
                  </div>
                )}
                {banner.published_at && (
                  <div>
                    <span className="text-gray-500">Published:</span>
                    <span className="ml-1">{formatDate(banner.published_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isEditing && !isDeleting && (
        <div className="p-4 border-t">
          <button
            onClick={() => setIsDeleting(true)}
            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Banner
          </button>
        </div>
      )}
    </div>
  );
};

export default BannerDetail;
