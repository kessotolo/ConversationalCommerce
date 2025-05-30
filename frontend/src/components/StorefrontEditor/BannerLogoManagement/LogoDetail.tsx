import React, { useState, useEffect } from 'react';
import { Logo, UUID, LogoStatus, LogoType, Asset } from '../../../types/storefrontEditor';
import { updateLogo, getLogo, getAssets } from '../../../lib/api/storefrontEditor';
import { 
  CheckIcon, 
  TrashIcon, 
  PencilIcon,
  ExclamationTriangleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

interface LogoDetailProps {
  logo: Logo;
  tenantId: UUID;
  onPublish: (logoId: UUID) => Promise<boolean>;
  onDelete: (logoId: UUID) => Promise<boolean>;
  onUpdate: () => void;
}

const LogoDetail: React.FC<LogoDetailProps> = ({ 
  logo, 
  tenantId, 
  onPublish, 
  onDelete,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: logo.name,
    logo_type: logo.logo_type,
    asset_id: logo.asset_id,
    display_settings: logo.display_settings || {},
    responsive_settings: logo.responsive_settings || {},
    start_date: logo.start_date || '',
    end_date: logo.end_date || ''
  });

  // Load assets for selection
  useEffect(() => {
    const loadAssets = async () => {
      if (isEditing) {
        setLoadingAssets(true);
        try {
          const response = await getAssets(tenantId, { asset_type: 'image', limit: 50 });
          setAssetList(response.items);
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
    return dateString.split('T')[0];
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await updateLogo(tenantId, logo.id, formData);
      setSuccessMessage('Logo updated successfully');
      setIsEditing(false);
      onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update logo');
      console.error('Error updating logo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await onPublish(logo.id);
      
      if (success) {
        setSuccessMessage('Logo published successfully');
      } else {
        setError('Failed to publish logo');
      }
    } catch (err) {
      setError('Failed to publish logo');
      console.error('Error publishing logo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await onDelete(logo.id);
      
      if (success) {
        setSuccessMessage('Logo deleted successfully');
      } else {
        setError('Failed to delete logo');
      }
    } catch (err) {
      setError('Failed to delete logo');
      console.error('Error deleting logo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get the selected asset details
  const selectedAsset = assetList.find(asset => asset.id === formData.asset_id);

  // Check if logo can be published
  const canPublish = logo.status === LogoStatus.DRAFT || logo.status === LogoStatus.INACTIVE;

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">Logo Details</h3>
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
                      Are you sure you want to delete this logo? This action cannot be undone.
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Logo Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="logo_type" className="block text-sm font-medium text-gray-700">
                Logo Type *
              </label>
              <select
                id="logo_type"
                name="logo_type"
                value={formData.logo_type}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {Object.values(LogoType).map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              
              <p className="mt-1 text-xs text-gray-500">
                {formData.logo_type === LogoType.PRIMARY && "The main logo displayed in the header"}
                {formData.logo_type === LogoType.SECONDARY && "Alternative logo used in specific contexts"}
                {formData.logo_type === LogoType.FOOTER && "Logo displayed in the footer"}
                {formData.logo_type === LogoType.MOBILE && "Optimized logo for mobile devices"}
                {formData.logo_type === LogoType.FAVICON && "Small icon displayed in browser tabs"}
              </p>
            </div>
            
            <div>
              <label htmlFor="asset_id" className="block text-sm font-medium text-gray-700">
                Logo Image *
              </label>
              
              {loadingAssets ? (
                <div className="mt-1 p-4 flex justify-center items-center border border-gray-300 border-dashed rounded-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                </div>
              ) : assetList.length === 0 ? (
                <div className="mt-1 p-4 flex flex-col items-center justify-center border border-gray-300 border-dashed rounded-md">
                  <PhotoIcon className="h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No images available</p>
                  <p className="text-xs text-gray-500">Please upload images in the Asset Management section</p>
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
                        src={`/api/assets/${selectedAsset.file_path.replace(/^.*[\\\/]/, '')}`}
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
            {/* Logo Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Logo Information</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{logo.name}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{logo.logo_type}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${logo.status === LogoStatus.DRAFT ? 'bg-gray-100 text-gray-800' : ''}
                      ${logo.status === LogoStatus.PUBLISHED ? 'bg-green-100 text-green-800' : ''}
                      ${logo.status === LogoStatus.INACTIVE ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {logo.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            
            {/* Logo Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Logo Preview</h4>
              <div className="bg-gray-100 p-4 rounded-md flex justify-center items-center border">
                <div className="h-32 max-w-full flex items-center justify-center">
                  {logo.asset_id ? (
                    <img
                      src={`/api/assets/${logo.asset_id}`}
                      alt={logo.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xOC45NTMxIDIzLjA5MzhDMjAuMDYyNSAyMy4wOTM4IDIwLjk3NjYgMjIuMTc5NyAyMC45NzY2IDIxLjA3MDNDMjAuOTc2NiAxOS45NjA5IDIwLjA2MjUgMTkuMDQ2OSAxOC45NTMxIDE5LjA0NjlDMTcuODQzOCAxOS4wNDY5IDE2LjkyOTcgMTkuOTYwOSAxNi45Mjk3IDIxLjA3MDNDMTYuOTI5NyAyMi4xNzk3IDE3Ljg0MzggMjMuMDkzOCAxOC45NTMxIDIzLjA5MzhaIiBmaWxsPSIjOTRBM0IzIi8+CjxwYXRoIGQ9Ik0zMy4wMDc4IDMwLjk3NjZDMzMuMDA3OCAzMC40Njg4IDMyLjU5MzggMzAuMDU0NyAzMi4wODU5IDMwLjA1NDdIMTcuOTE0MUMxNy40MDYyIDMwLjA1NDcgMTYuOTkyMiAzMC40Njg4IDE2Ljk5MjIgMzAuOTc2NkMxNi45OTIyIDMxLjQ4NDQgMTcuNDA2MiAzMS44OTg0IDE3LjkxNDEgMzEuODk4NEgzMi4wODU5QzMyLjU5MzggMzEuODk4NCAzMy4wMDc4IDMxLjQ4NDQgMzMuMDA3OCAzMC45NzY2WiIgZmlsbD0iIzk0QTNCMyIvPgo8cGF0aCBkPSJNMzYuMzI4MSAyNS44MjAzQzM2LjMyODEgMjUuNDYwOSAzNi4wOTM4IDI1LjEyNSAzNS43MzQ0IDI0Ljk2MDlDMzUuMzcgMjQuODIwMyAzNC45NjQ4IDI0Ljg1OTQgMzQuNjQwNiAyNS4xMTcyTDMxLjMyODEgMjcuNzUzOUwyNi43NSAyMS41MTE3QzI2LjQ4NDQgMjEuMTU2MiAyNS45OTIyIDIxLjA3ODEgMjUuNjM2NyAyMS4zNDM4TDE4LjA3MDMgMjcuMTE3MkwxNS4yODkxIDI0LjgzNTlDMTQuOTQ1MyAyNC41NTQ3IDE0LjQ1MzEgMjQuNTM1MiAxNC4wODk4IDI0Ljc4MTJDMTMuNzI2NiAyNS4wMjczIDEzLjU1ODYgMjUuNDg0NCAxMy42OTkyIDI1Ljg5ODRMMTYuMTg3NSAzMy4yMzQ0QzE2LjI4OTEgMzMuNTI3MyAxNi41MzUyIDMzLjc1MzkgMTYuODMyIDMzLjgyODFDMTYuODk0NSAzMy44NDM4IDE2Ljk1NzAgMzMuODQ3NyAxNy4wMTk1IDMzLjg0NzdDMTcuMjU3OCAzMy44NDc3IDE3LjQ4ODMgMzMuNzYxNyAxNy42NjQxIDMzLjYwMTZMMjUuNzM0NCAyNi4zMzU5TDMwLjMyODEgMzIuNTk3N0MzMC41MzEyIDMyLjg2MzMgMzAuODQzOCAzMy4wMDc4IDMxLjE3MTkgMzMuMDA3OEMzMS4zNjMzIDMzLjAwNzggMzEuNTU4NiAzMi45NTMxIDMxLjcyNjYgMzIuODI4MUwzNS45MTQxIDI5LjU3MDNDMzYuMTc5NyAyOS4zNzExIDM2LjMyODEgMjkuMDU0NyAzNi4zMjgxIDI4LjcxODhWMjUuODIwM1oiIGZpbGw9IiM5NEEzQjMiLz4KPC9zdmc+Cg==';
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
            
            {/* Display Settings */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Display Settings</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                {Object.keys(logo.display_settings || {}).length > 0 ? (
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(logo.display_settings || {}).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-gray-500 capitalize">{key.replace('_', ' ')}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">No display settings configured</p>
                )}
              </div>
            </div>
            
            {/* Schedule */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Schedule</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="text-sm">{formatDate(logo.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="text-sm">{formatDate(logo.end_date)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Metadata */}
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Metadata</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-1">{formatDate(logo.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Created By:</span>
                  <span className="ml-1">{logo.created_by}</span>
                </div>
                {logo.modified_at && (
                  <div>
                    <span className="text-gray-500">Modified:</span>
                    <span className="ml-1">{formatDate(logo.modified_at)}</span>
                  </div>
                )}
                {logo.published_at && (
                  <div>
                    <span className="text-gray-500">Published:</span>
                    <span className="ml-1">{formatDate(logo.published_at)}</span>
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
            Delete Logo
          </button>
        </div>
      )}
    </div>
  );
};

export default LogoDetail;
