import React from 'react';
import { Phone, User } from 'lucide-react';
import { Button, Select } from '@mui/material';
import { Store } from '@/types/Store';import * as React from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';

interface OnboardingFormProps {
  onSubmitSuccess?: () => void;
}

export default function OnboardingForm({ onSubmitSuccess }: OnboardingFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  // Form state
  const [formData, setFormData] = useState({
    storeName: '',
    businessName: '',
    phoneNumber: '',
    storeEmail: user?.primaryEmailAddress?.emailAddress || '',
    category: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSubdomain, setGeneratedSubdomain] = useState<string | null>(null);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Generate subdomain preview when store name changes
    if (name === 'storeName') {
      const subdomain = generateSubdomain(value);
      setGeneratedSubdomain(subdomain);
    }
  };
  
  // Generate subdomain from store name
  const generateSubdomain = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '')      // Remove leading/trailing hyphens
      || 'my-store';              // Fallback
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded || !user) {
      setError('User authentication required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Generate subdomain from store name if not already set
      const subdomain = generatedSubdomain || generateSubdomain(formData.storeName);
      
      // API call to create tenant and store
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          subdomain,
          userId: user.id,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create store');
      }
      
      // Success - redirect to dashboard or trigger callback
      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        router.push('/dashboard');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Industries/categories list
  const categories = [
    { value: '', label: 'Select a category' },
    { value: 'retail', label: 'Retail & Consumer Goods' },
    { value: 'food', label: 'Food & Beverages' },
    { value: 'fashion', label: 'Fashion & Apparel' },
    { value: 'electronics', label: 'Electronics & Technology' },
    { value: 'health', label: 'Health & Beauty' },
    { value: 'home', label: 'Home & Furniture' },
    { value: 'art', label: 'Art & Crafts' },
    { value: 'services', label: 'Services' },
    { value: 'other', label: 'Other' },
  ];
  
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Set up your store</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Store Name */}
        <div className="mb-4">
          <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
            Store Name <span className="text-red-500">*</span>
          </label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Joe's Coffee"
            value={formData.storeName}
            onChange={handleChange}
          />
          {generatedSubdomain && (
            <p className="mt-1 text-sm text-gray-500">
              Your store URL: <strong>{generatedSubdomain}.yourplatform.com</strong>
            </p>
          )}
        </div>
        
        {/* Business/Legal Name */}
        <div className="mb-4">
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
            Business/Legal Name <span className="text-red-500">*</span>
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Joe's Coffee LLC"
            value={formData.businessName}
            onChange={handleChange}
          />
        </div>
        
        {/* Phone Number */}
        <div className="mb-4">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="+1234567890"
            value={formData.phoneNumber}
            onChange={handleChange}
          />
          <p className="mt-1 text-sm text-gray-500">
            Used for WhatsApp and customer communications
          </p>
        </div>
        
        {/* Store Email */}
        <div className="mb-4">
          <label htmlFor="storeEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Store Email
          </label>
          <input
            id="storeEmail"
            name="storeEmail"
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="store@example.com"
            value={formData.storeEmail}
            onChange={handleChange}
          />
          <p className="mt-1 text-sm text-gray-500">
            Pre-filled with your login email. Change if you have a separate store email.
          </p>
        </div>
        
        {/* Store Category */}
        <div className="mb-6">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Store Category
          </label>
          <select
            id="category"
            name="category"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={formData.category}
            onChange={handleChange}
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isSubmitting 
              ? 'bg-indigo-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isSubmitting ? 'Creating your store...' : 'Create my store'}
        </button>
      </form>
    </div>
  );
}
