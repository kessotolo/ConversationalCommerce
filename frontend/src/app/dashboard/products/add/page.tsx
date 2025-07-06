'use client';

import { ArrowLeft, Camera, Upload, Trash2, MessageSquare, Globe, Check, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NewProduct {
  name: string;
  price: number;
  image?: string;
  description: string;
  inStock: boolean;
  category: string;
  channels: {
    whatsapp: boolean;
    web: boolean;
  };
}

// Sample categories for the datalist
const categories = ['Fruits', 'Vegetables', 'Beverages', 'Bakery', 'Dairy', 'Meat', 'Snacks'];

export default function AddProductPage() {
  const router = useRouter();

  const [product, setProduct] = useState<NewProduct>({
    name: '',
    price: 0,
    description: '',
    category: '',
    inStock: true,
    channels: {
      whatsapp: true,
      web: true,
    },
  });

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Direct camera capture for mobile
  const openCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // File upload trigger
  const openFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle camera capture
  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };

  // Process the selected image file
  const processImageFile = (file: File) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);

        // In a real app, this would upload to Cloudinary
        console.log('Would upload to Cloudinary:', file.name);
      }
    };

    reader.readAsDataURL(file);
  };

  // Remove image
  const removeImage = () => {
    setCapturedImage(null);
  };

  // Handle save
  const handleSave = () => {
    if (!product?.name || product?.price <= 0) {
      alert('Please fill in at least the name and price');
      return;
    }

    setIsSaving(true);

    // In a real app, this would be an API call
    setTimeout(() => {
      setIsSaving(false);
      router.push('/dashboard/products');
    }, 1000);
  };

  // Handle field change
  const handleChange = (field: keyof NewProduct, value: unknown) => {
    setProduct({
      ...product,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6 px-4 pb-24">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/dashboard/products" className="mr-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">Add New Product</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="flex items-center">
          {isSaving ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
              Saving...
            </span>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Product form */}
      <Card>
        <CardContent className="p-4 space-y-6 pt-6">
          {/* Channel Visibility */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Sell this product on:</label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  handleChange('channels', {
                    ...product?.channels,
                    whatsapp: !product?.channels.whatsapp,
                  })
                }
                className={`flex items-center px-4 py-2 rounded-md ${product?.channels.whatsapp ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                WhatsApp
                {product?.channels.whatsapp && <Check size={16} className="ml-2 text-green-600" />}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleChange('channels', { ...product?.channels, web: !product?.channels.web })
                }
                className={`flex items-center px-4 py-2 rounded-md ${product?.channels.web ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
              >
                <Globe className="mr-2 h-4 w-4" />
                Web Store
                {product?.channels.web && <Check size={16} className="ml-2 text-blue-600" />}
              </button>
            </div>
          </div>

          {/* Product image with improved mobile experience */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Product Image</label>
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
              {capturedImage ? (
                <div className="relative w-40 h-40 rounded-lg overflow-hidden bg-gray-100 shadow-md">
                  <img src={capturedImage} alt="Product" className="w-full h-full object-cover" />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-40 h-40 rounded-lg bg-gray-100 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                  <Upload size={24} className="mb-2 text-gray-400" />
                  <span className="text-gray-500 text-sm text-center px-2">
                    Tap to add product image
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 w-full sm:w-auto">
                {/* Hidden file inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCapture}
                  className="hidden"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={openCamera}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    Take Photo
                  </Button>

                  <Button
                    type="button"
                    onClick={openFileUpload}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                  >
                    <Upload size={16} />
                    Upload Image
                  </Button>
                </div>

                <p className="text-xs text-gray-500">
                  Upload a clear photo of your product. For best results, use natural lighting and a
                  plain background.
                </p>
              </div>
            </div>
          </div>

          {/* Product details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name*
              </label>
              <input
                type="text"
                id="name"
                value={product?.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price*
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₦</span>
                </div>
                <input
                  type="number"
                  id="price"
                  min="0"
                  step="0.01"
                  value={product?.price}
                  onChange={(e) => handleChange('price', Number(e.target.value))}
                  className="pl-7 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
            </div>

            <div className="col-span-full">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={product?.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                id="category"
                list="category-options"
                value={product?.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              <datalist id="category-options">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="inStock"
                checked={product?.inStock}
                onChange={(e) => handleChange('inStock', e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="inStock" className="ml-2 block text-sm text-gray-700">
                In Stock
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
