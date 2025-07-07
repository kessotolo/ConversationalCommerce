'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { productService } from '@/lib/api';
import ProductCard from '@/components/storefront/ProductCard';
import { useCart } from '@/lib/cart';
import type { Product } from '@/modules/core/models/product';

// Helper to guarantee merchantIdString is string | null
function safeGetId(searchParams: ReturnType<typeof useSearchParams>): string | null {
  const id = searchParams?.get('id');
  if (typeof id === 'string') return id;
  return null;
}

// Component that uses searchParams (must be wrapped in Suspense)
function StoreContent() {
  const searchParams = useSearchParams();
  // @ts-ignore Next.js useSearchParams().get() type is too broad; safeGetId guarantees string | null
  const merchantIdString: string | null = safeGetId(searchParams);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (merchantIdString) {
      fetchProducts();
    }
  }, [merchantIdString]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Here you would typically filter products by merchant ID
      const response = await productService.getProducts();
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(
        error !== null && error !== undefined
          ? String(error)
          : 'Failed to load products. Please try again later.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url ?? null,
    });
  };

  if (!merchantIdString) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">Store Not Found</h1>
          <p className="text-gray-600">No merchant ID provided.</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-[#fdfcf7]">
      {/* Header with Back to Home */}
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 bg-white/80 backdrop-blur border-b border-gray-100 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[#6C9A8B] font-semibold hover:underline text-sm sm:text-base"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <span className="ml-4 text-xl font-bold text-gray-900 font-sans">ConvoCommerce</span>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Store Products</h1>
        <p className="mb-6 text-gray-600">Merchant ID: {merchantIdString}</p>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-600">No products available.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function StoreViewPage() {
  return (
    <Suspense fallback={<div className="text-center p-4">Loading store...</div>}>
      <StoreContent />
    </Suspense>
  );
}
