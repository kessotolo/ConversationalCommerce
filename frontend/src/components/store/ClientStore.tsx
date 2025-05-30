import * as React from 'react';
'use client';
import { Product } from '@/types/product';

import { useState, useEffect } from 'react';
import { productService } from '@/lib/api';
import ProductCard from '@/components/storefront/ProductCard';
import { useCart } from '@/lib/cart';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  created_at: string;
  is_available: boolean;
}

interface ClientStoreProps {
  merchantId: string;
}

export default function ClientStore({ merchantId }: ClientStoreProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    fetchProducts();
  }, [merchantId]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Here you would typically filter products by merchant ID
      const response = await productService.getProducts();
      setProducts(response.data);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">No products available at this time.</p>
          </div>
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => handleAddToCart(product)}
            />
          ))
        )}
      </div>
    </div>
  );
}
