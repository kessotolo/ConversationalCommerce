'use client';

import { ArrowLeft, Trash2, Save, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { productService } from '@/lib/api';
import type { Product, CreateProductRequest, UpdateProductRequest, ProductResponse } from '@/modules/core/models/product';
import type { ApiResponse } from '@/lib/api';

interface ShareLinks {
  whatsapp?: { url: string };
  instagram?: { url: string };
  tiktok?: { url: string };
}

function ShareModal({ shareLinks, onClose }: { shareLinks: ShareLinks | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg relative w-80 flex flex-col items-center">
        <button className="absolute top-2 right-2" onClick={onClose}>✕</button>
        <h2 className="font-bold mb-4">Share your product</h2>
        {shareLinks?.whatsapp && (
          <a href={shareLinks.whatsapp.url} target="_blank" rel="noopener noreferrer" className="btn w-full mb-2 bg-green-100">WhatsApp</a>
        )}
        {shareLinks?.instagram && (
          <a href={shareLinks.instagram.url} target="_blank" rel="noopener noreferrer" className="btn w-full mb-2 bg-pink-100">Instagram</a>
        )}
        {shareLinks?.tiktok && (
          <a href={shareLinks.tiktok.url} target="_blank" rel="noopener noreferrer" className="btn w-full mb-2 bg-black text-white">TikTok</a>
        )}
      </div>
    </div>
  );
}

// Product detail page component
export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const isNewProduct = productId === 'new';

  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<CreateProductRequest & UpdateProductRequest>>({
    name: '',
    description: '',
    price: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLinks | null>(null);

  useEffect(() => {
    if (isNewProduct) {
      setProduct(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    productService.getProduct(productId)
      .then((res: ApiResponse<ProductResponse>) => {
        setProduct(res.data.product);
        setForm({
          name: res.data.product.name ?? '',
          description: res.data.product.description ?? '',
          price: res.data.product.price ?? 0,
        });
      })
      .catch(() => {
        setError('Product not found');
      })
      .finally(() => setIsLoading(false));
  }, [productId, isNewProduct]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, video: file }));
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      if (isNewProduct) {
        const req: CreateProductRequest = {
          name: form.name ?? '',
          description: form.description ?? '',
          price: typeof form.price === 'number' ? form.price : Number(form.price) || 0,
          ...(form.video ? { video: form.video } : {}),
        };
        const res = await productService.createProduct(req);
        // Fetch share links for the new product
        const productId = res.data.product['id'];
        try {
          const apiBase = typeof process !== 'undefined' ? (process.env['NEXT_PUBLIC_API_BASE'] ?? '') : '';
          const shareRes = await fetch(`${apiBase}/api/v1/share/all-platforms?product_id=${productId}`);
          if (shareRes.ok) {
            setShareLinks(await shareRes.json());
            setShowShareModal(true);
          }
        } catch { }
        // Optionally, you can also navigate to the product page or reset the form
      } else if (product) {
        const req: UpdateProductRequest = {
          name: form.name ?? '',
          description: form.description ?? '',
          price: typeof form.price === 'number' ? form.price : Number(form.price) || 0,
          ...(form.video ? { video: form.video } : {}),
        };
        await productService.updateProduct(product.id, req);
        router.push('/dashboard/products');
      }
    } catch (err) {
      setError('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm('Are you sure you want to delete this product?')) return;
    setIsSaving(true);
    setError(null);
    try {
      await productService.deleteProduct(product.id);
      router.push('/dashboard/products');
    } catch (err) {
      setError('Failed to delete product');
    } finally {
      setIsSaving(false);
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Product image display */}
          {product && product.image_url && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
              <div className="relative w-32 h-32 border rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="rounded-md object-cover"
                />
              </div>
            </div>
          )}
          {/* Product video upload and preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Video (optional)</label>
            <input type="file" id="product-video" name="productVideo" accept="video/*" onChange={handleVideoChange} />
            {videoPreview && (
              <video controls src={videoPreview} className="mt-2 w-64 h-40 rounded-md" />
            )}
            {!videoPreview && product && product.video_url && (
              <video controls src={product.video_url} className="mt-2 w-64 h-40 rounded-md" />
            )}
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
                value={form.name || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price*
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={form.price || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description*
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description || ''}
              onChange={handleChange}
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-4">
            {!isNewProduct && (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={isSaving}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button type="submit" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : isNewProduct ? 'Create Product' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {showShareModal && (
        <ShareModal shareLinks={shareLinks} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}

// This ensures the page is properly recognized as a Next.js module
export const dynamic = 'force-dynamic';
