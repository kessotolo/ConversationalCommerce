'use client';

// TODO: Fix any types below (ESLint @typescript-eslint/no-explicit-any)
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Trash2, Camera, Upload, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
// DashboardLayout now provided by layout.tsx

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
    image:
      'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFuYW5hfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60',
    description: 'Fresh organic bananas from local farms.',
    inStock: true,
    category: 'Fruits',
  },
  {
    id: '2',
    name: 'Premium Coffee Beans',
    price: 12.99,
    image:
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Y29mZmVlJTIwYmVhbnN8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
    description: 'Freshly roasted premium coffee beans.',
    inStock: true,
    category: 'Beverages',
  },
  {
    id: '3',
    name: 'Whole Wheat Bread',
    price: 3.49,
    image:
      'https://images.unsplash.com/photo-1586444248892-4aa5712a2660?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YnJlYWR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
    description: 'Freshly baked whole wheat bread.',
    inStock: true,
    category: 'Bakery',
  },
];

// Categories derived from products
const categories = Array.from(new Set(mockProducts.map((p) => p.category)));

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Product | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load product data
  useEffect(() => {
    const foundProduct = mockProducts.find((p) => p.id === productId);
    setProduct(foundProduct);
    setEditedProduct(foundProduct ? { ...foundProduct } : undefined);
  }, [productId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (!editedProduct) return;

    const { name, value } = e.target;

    if (name === 'price') {
      setEditedProduct({
        ...editedProduct,
        [name]: parseFloat(value) || 0,
      });
    } else if (name === 'inStock') {
      setEditedProduct({
        ...editedProduct,
        inStock: (e.target as HTMLInputElement).checked,
      });
    } else {
      setEditedProduct({
        ...editedProduct,
        [name]: value,
      });
    }
  };

  const handleSave = () => {
    // In a real app, this would be an API call
    setProduct(editedProduct);
    setIsEditing(false);
    // Mock successful save
    alert('Product updated successfully!');
  };

  const handleDelete = () => {
    // In a real app, this would be an API call
    alert('Product deleted successfully!');
    router.push('/dashboard/products');
  };

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <Link
            href="/dashboard/products"
            className="text-blue-500 hover:text-blue-700 mt-4 inline-block"
          >
            <div className="flex items-center">
              <ArrowLeft size={16} className="mr-1" />
              <span>Back to Products</span>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/dashboard/products" className="text-blue-500 hover:text-blue-700">
          <div className="flex items-center">
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Products</span>
          </div>
        </Link>
        <div className="space-x-2">
          {isEditing ? (
            <>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditedProduct(product);
                }}
                variant="outline"
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                <Save size={16} className="mr-1" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Edit Product
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 relative h-64 md:h-auto">
            {product.image ? (
              <Image src={product.image} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Camera size={48} className="text-gray-400" />
                <span className="ml-2 text-gray-500">No Image</span>
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <button className="bg-white p-2 rounded-full">
                  <Upload size={24} className="text-blue-600" />
                </button>
              </div>
            )}
          </div>
          <div className="p-6 md:w-2/3">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Product Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editedProduct?.name || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={editedProduct?.category || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="price"
                    name="price"
                    value={editedProduct?.price || 0}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={editedProduct?.description || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="inStock"
                    name="inStock"
                    checked={editedProduct?.inStock || false}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="inStock" className="ml-2 block text-sm text-gray-700">
                    In Stock
                  </label>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
                <div className="flex items-center mb-4">
                  <span className="text-gray-600">{product.category}</span>
                  <span className="mx-2">•</span>
                  <span className={product.inStock ? 'text-green-600' : 'text-red-600'}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-4">
                  ${product.price.toFixed(2)}
                </div>
                <p className="text-gray-700 mb-6">{product.description}</p>
                <div className="border-t pt-4">
                  <h2 className="text-lg font-semibold mb-2">Product Details</h2>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>
                      <span className="font-medium">ID:</span> {product.id}
                    </li>
                    <li>
                      <span className="font-medium">Category:</span> {product.category}
                    </li>
                    <li>
                      <span className="font-medium">Availability:</span>{' '}
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          {showDeleteConfirm ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-amber-600">
                <AlertTriangle size={16} className="mr-1" />
                <span>Are you sure you want to delete this product?</span>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
              >
                Confirm Delete
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-800 flex items-center"
            >
              <Trash2 size={16} className="mr-1" />
              <span>Delete Product</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
