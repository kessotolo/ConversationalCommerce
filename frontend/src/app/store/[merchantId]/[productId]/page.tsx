'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Product } from '@/modules/core/models/product';

const API_BASE = typeof process !== 'undefined' ? (process.env['NEXT_PUBLIC_API_BASE'] ?? '') : '';

interface ShareLinks {
  whatsapp?: { url: string };
  instagram?: { url: string };
  tiktok?: { url: string };
}

export default function ProductDetailPage() {
  const params = useParams();
  const { productId } = params as { merchantId: string; productId: string };
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLinks | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/storefront_catalog/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setProduct(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    async function fetchShareLinks() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/share/all-platforms?product_id=${productId}`);
        if (res.ok) {
          setShareLinks(await res.json());
        }
      } catch {
        /* ignore errors */
      }
    }
    fetchShareLinks();
  }, [productId]);

  const handleShowQR = async () => {
    setQrModal(true);
    setQrUrl(`${API_BASE}/api/v1/share/qr-code?product_id=${productId}`);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!product) return null;

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow mt-4">
      <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>
      <h1 className="text-2xl font-bold mt-4 mb-2">{product.name}</h1>
      <p className="text-gray-600 mb-2">{product.description}</p>
      <div className="text-xl font-semibold text-[#6C9A8B] mb-4">${product.price?.toFixed(2)}</div>
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
          onClick={handleShowQR}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" stroke="#333" strokeWidth="2" />
            <rect x="14" y="3" width="7" height="7" stroke="#333" strokeWidth="2" />
            <rect x="3" y="14" width="7" height="7" stroke="#333" strokeWidth="2" />
            <rect x="14" y="14" width="3" height="3" stroke="#333" strokeWidth="2" />
          </svg>
          Show QR
        </button>
        {shareLinks?.whatsapp && (
          <a
            href={shareLinks.whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded bg-green-100 hover:bg-green-200"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M20.52 3.48A12 12 0 003.48 20.52l-1.44 5.28 5.28-1.44A12 12 0 0020.52 3.48z"
                stroke="#25D366"
                strokeWidth="2"
              />
              <path d="M16.24 7.76a6 6 0 11-8.48 8.48" stroke="#25D366" strokeWidth="2" />
            </svg>
            WhatsApp
          </a>
        )}
        {shareLinks?.instagram && (
          <a
            href={shareLinks.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded bg-pink-100 hover:bg-pink-200"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="2" />
              <circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="2" />
              <circle cx="17" cy="7" r="1.5" fill="#E1306C" />
            </svg>
            Instagram
          </a>
        )}
        {shareLinks?.tiktok && (
          <a
            href={shareLinks.tiktok.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M9 17a4 4 0 104 4v-7h3a5 5 0 01-5-5V3h3v6a2 2 0 002 2h2v3h-2a5 5 0 01-5 5v3z"
                stroke="#fff"
                strokeWidth="2"
              />
            </svg>
            TikTok
          </a>
        )}
      </div>
      {qrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg relative w-80 flex flex-col items-center">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setQrModal(false)}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M6 6l12 12M6 18L18 6" stroke="#333" strokeWidth="2" />
              </svg>
            </button>
            <div className="mb-2 font-semibold">Scan to view or buy</div>
            {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48" />}
          </div>
        </div>
      )}
    </div>
  );
}
