import React, { ChangeEvent } from 'react';


'use client';
// Removed circular import;
import { ArrowLeft, Camera, Save, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
// Removed circular import;
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
  category: string;
}

// Mock products data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Organic Bananas',
    price: 1.99,
    image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFuYW5hfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60',
    description: 'Fresh organic bananas from local farms.',
    inStock: true,
    category: 'Fruits'
  },
  {
    id: '2',
    name: 'Premium Coffee Beans',
    price: 12.99,
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Y29mZmVlJTIwYmVhbnN8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
    description: 'Freshly roasted premium coffee beans.',
    inStock: true,
    category: 'Beverages'
  },
  {
    id: '3',
    name: 'Whole Wheat Bread',
    price: 3.49,
    image: 'https://images.unsplash.com/photo-1586444248892-4aa5712a2660?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YnJlYWR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
    description: 'Freshly baked whole wheat bread.',
    inStock: true,
    category: 'Bakery'
  }
];

// Categories derived from products
const categories = Array.from(new Set(mockProducts.map(p => p.category)));

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch product data
  useEffect(() => {
    // In a real app, this would be an API call
    const foundProduct = mockProducts.find(p => p.id === productId);
    
    if (foundProduct) {
      setProduct(foundProduct);
    }
    
    setIsLoading(false);
  }, [productId]);
  
  // Handle camera capture
  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewImage(reader.result);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewImage(reader.result);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Handle save
  const handleSave = () => {
    if (!product) return;
    
    setIsSaving(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      // Update product with new image if available
      if (newImage) {
        setProduct({
          ...product,
          image: newImage
        });
      }
      
      setIsSaving(false);
      
      // Show success message or redirect
      router.push('/dashboard/products');
    }, 1000);
  };
  
  // Handle field change
  const handleChange = (field: keyof Product, value: any) => {
    if (!product) return;
    
    setProduct({
      ...product,
      [field]: value
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-500">Product not found</p>
        <Link href="/dashboard/products" className="mt-4 inline-block text-primary">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard/products" className="mr-2">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">Edit Product</h1>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </span>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Product form */}
        <div className="bg-white rounded-lg shadow p-4 space-y-6">
          {/* Product image */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Product Image</label>
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
              <div className="w-32 h-32 rounded-md overflow-hidden bg-gray-100">
                <img 
                  src={newImage || product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex flex-col gap-2 justify-center">
                {/* Camera capture - mobile only */}
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <Camera className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm">Take Photo</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleCapture}
                  />
                </label>
                
                {/* File upload */}
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <Upload className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm">Upload Image</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          </div>
          
          {/* Product details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
              <input
                type="text"
                id="name"
                value={product.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="price"
                  value={product.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                  className="block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-primary focus:ring-primary"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <input
                type="text"
                id="category"
                value={product.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                list="categories"
              />
              <datalist id="categories">
                {categories.map(category => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Stock Status</label>
              <div className="mt-1 flex items-center">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={product.inStock}
                  onChange={(e) => handleChange('inStock', e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="inStock" className="ml-2 block text-sm text-gray-700">
                  In Stock
                </label>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                value={product.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Delete button */}
          <div className="pt-4 border-t">
            <button 
              className="flex items-center text-red-600 hover:text-red-800"
              onClick={() => {
                if (confirm('Are you sure you want to delete this product?')) {
                  router.push('/dashboard/products');
                }
              }}
            >
              <Trash2 size={16} className="mr-1" />
              <span>Delete Product</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
