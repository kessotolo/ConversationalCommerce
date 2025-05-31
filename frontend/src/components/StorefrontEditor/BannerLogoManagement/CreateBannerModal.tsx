import React, { ChangeEvent, FC, FormEvent } from 'react';


// Removed self-import
// Removed self-importimport * as React from 'react';
import { Select } from '@mui/material';import { CreateBannerModalProps } from '@/components/StorefrontEditor/BannerLogoManagement/CreateBannerModal';import { Image } from 'next/image';
import { Link } from 'next/link';
import { createBanner, getAssets } from '../../../lib/api/StorefrontEditor';
import { UUID, BannerType, TargetAudience, Asset } from '../../../types/StorefrontEditor';
import { XMarkIcon, ExclamationTriangleIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface CreateBannerModalProps {
  tenantId: UUID;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBannerModal: React.FC<CreateBannerModalProps> = ({ 
  tenantId, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    banner_type: BannerType.HERO,
    asset_id: '',
    link_url: '',
    start_date: '',
    end_date: '',
    target_audience: [TargetAudience.ALL] as TargetAudience[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Load assets for selection
  useEffect(() => {
    const loadAssets = async () => {
      setLoadingAssets(true);
      try {
        const response = await getAssets(tenantId, { asset_type: 'image', limit: 50 });
        setAssetList(response.items);
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle checkbox changes for target audience
  const handleTargetAudienceChange = (audience: TargetAudience) => {
    const current = [...formData.target_audience];
    
    // If ALL is selected, remove all other options
    if (audience === TargetAudience.ALL) {
      setFormData({ ...formData, target_audience: [TargetAudience.ALL] });
      return;
    }
    
    // If switching from ALL to something else, remove ALL
    const newAudience = current.includes(TargetAudience.ALL)
      ? [audience]
      : current.includes(audience)
        ? current.filter(a => a !== audience) // Remove if already selected
        : [...current, audience]; // Add if not selected
    
    // If nothing selected, default to ALL
    if (newAudience.length === 0) {
      setFormData({ ...formData, target_audience: [TargetAudience.ALL] });
    } else {
      setFormData({ ...formData, target_audience: newAudience });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
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
      await createBanner(tenantId, formData);
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
  const selectedAsset = assetList.find(asset => asset.id === formData.asset_id);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">Create New Banner</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
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
              <label htmlFor="banner_type" className="block text-sm font-medium text-gray-700">
                Banner Type *
              </label>
              <select
                id="banner_type"
                name="banner_type"
                value={formData.banner_type}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {Object.values(BannerType).map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              
              <p className="mt-1 text-xs text-gray-500">
                {formData.banner_type === BannerType.HERO && "Hero banners are large and prominently displayed at the top of the page"}
                {formData.banner_type === BannerType.PROMOTION && "Promotion banners highlight sales or special offers"}
                {formData.banner_type === BannerType.ANNOUNCEMENT && "Announcement banners communicate important information to users"}
                {formData.banner_type === BannerType.SPECIAL && "Special banners are used for unique or seasonal content"}
              </p>
            </div>
            
            <div>
              <label htmlFor="asset_id" className="block text-sm font-medium text-gray-700">
                Banner Image *
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
                    <label htmlFor={`audience-${audience}`} className="ml-2 block text-sm text-gray-700">
                      {audience.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  </div>
                ))}
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
            onClick={handleSubmit}
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
