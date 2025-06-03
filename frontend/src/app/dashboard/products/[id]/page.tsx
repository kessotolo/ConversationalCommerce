'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Trash2, Camera, Upload, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Product type definition following our core domain model patterns
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
  // Additional products omitted for brevity
];

// Categories derived from products
const categories = Array.from(new Set(mockProducts.map((p) => p.category)));

// Product detail page component
export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const isNewProduct = productId === 'new';

  const [product, setProduct] = useState<Product>({
    id: '',
    name: '',
    price: 0,
    image: '',
    description: '',
    inStock: true,
    category: categories[0] || '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Load product data
  useEffect(() => {
    if (isNewProduct) {
      setIsLoading(false);
      return;
    }

    // Simulate API call to fetch product
    const fetchProduct = () => {
      setIsLoading(true);
      try {
        // For demo, just find in our mock data
        const foundProduct = mockProducts.find((p) => p.id === productId);
        if (foundProduct) {
          setProduct(foundProduct);
          setError('');
        } else {
          setError('Product not found');
        }
      } catch (err) {
        setError('Failed to load product');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, isNewProduct]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setProduct((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else if (type === 'number') {
      setProduct((prev) => ({
        ...prev,
        [name]: parseFloat(value),
      }));
    } else {
      setProduct((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      // Simulate API call to save product
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For a new product, assign an ID
      if (isNewProduct) {
        const newId = (Math.max(...mockProducts.map((p) => parseInt(p.id))) + 1).toString();
        setProduct((prev) => ({ ...prev, id: newId }));
      }

      // Navigate back to products list after save
      router.push('/dashboard/products');
    } catch (err) {
      setError('Failed to save product');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle product deletion
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      // Simulate API call to delete product
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate back to products list after delete
      router.push('/dashboard/products');
    } catch (err) {
      setError('Failed to delete product');
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/dashboard/products"
        className="inline-flex items-center mb-6 text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        {isNewProduct ? 'Add New Product' : 'Edit Product'}
      </h1>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Product image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <div className="flex items-center space-x-5">
              <div className="relative w-32 h-32 border rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                  />
                ) : (
                  <Camera className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                {product.image && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => setProduct((prev) => ({ ...prev, image: '' }))}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={product.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={product.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category*
            </label>
            <select
              id="category"
              name="category"
              value={product.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={product.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="inStock"
              name="inStock"
              checked={product.inStock}
              onChange={(e) => setProduct((prev) => ({ ...prev, inStock: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="inStock" className="ml-2 block text-sm text-gray-700">
              In Stock
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            {!isNewProduct && (
              <Button
                type="button"
                onClick={handleDelete}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Product
              </Button>
            )}
            <div className="ml-auto">
              <Button type="submit" disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

// This ensures the page is properly recognized as a Next.js module
export const dynamic = 'force-dynamic';
