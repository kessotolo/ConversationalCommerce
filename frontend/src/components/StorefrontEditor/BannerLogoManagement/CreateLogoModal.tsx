import React from 'react';
import { BannerLogoManagement } from '@/components/StorefrontEditor/BannerLogoManagement/BannerLogoManagement';
import { CreateLogoModal } from '@/components/StorefrontEditor/BannerLogoManagement/CreateLogoModal';import * as React from 'react';
import { Select } from '@mui/material';import { CreateLogoModalProps } from '@/components/StorefrontEditor/BannerLogoManagement/CreateLogoModal';import { Image } from 'next/image';
import { createLogo, getAssets } from '../../../lib/api/storefrontEditor';
import { UUID, LogoType, Asset } from '../../../types/storefrontEditor';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface CreateLogoModalProps {
  tenantId: UUID;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateLogoModal: React.FC<CreateLogoModalProps> = ({ tenantId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    logo_type: LogoType.PRIMARY as LogoType,
    asset_id: '',
    display_settings: {},
    responsive_settings: {},
    start_date: '',
    end_date: ''
  });

  // Load assets for selection
  useEffect(() => {
    const loadAssets = async () => {
      setLoadingAssets(true);
      try {
        const response = await getAssets(tenantId, { asset_type: 'image', limit: 50 });
        setAssets(response.items);
      } catch (err) {
        console.error('Error loading assets:', err);
        setError('Failed to load assets. Please try again.');
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await createLogo(tenantId, {
        ...formData,
        // Convert empty strings to null
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating logo:', err);
      setError('Failed to create logo. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get the selected asset details
  const selectedAsset = assets.find(asset => asset.id === formData.asset_id);

  return (
    <div className="fixed inset-0 overflow-y-auto z-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-headline"
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                Create New Logo
              </Dialog.Title>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}

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
                  placeholder="Enter logo name"
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
                ) : assets.length === 0 ? (
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
                      {assets.map((asset) => (
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
                    min={formData.start_date}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || loadingAssets}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Creating...' : 'Create Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLogoModal;
