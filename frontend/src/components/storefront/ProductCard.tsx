import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { useTheme } from '@/contexts/ThemeContext';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import type { Product } from '@/modules/core/models/product';

interface ProductCardProps {
  product: Product;
  onAddToCart?: () => void;
}

const API_BASE = process.env['NEXT_PUBLIC_API_BASE'] || '';

export default function ProductCard({ product, onAddToCart }: ProductCardProps): JSX.Element {
  const { theme } = useTheme();
  const styles = useThemeStyles();
  const [isHovered, setIsHovered] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, { url: string }> | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);
  const [errorShare, setErrorShare] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const { merchantId } = params as { merchantId?: string };
  const session_id = typeof window !== 'undefined' ? localStorage.getItem('session_id') || '' : '';

  // Combine default styles with hover state styles when needed
  const cardStyle = {
    ...styles.product.style,
    ...(isHovered ? styles.product.hoverStyle : {}),
  };

  const fetchShareLinks = async () => {
    if (shareLinks || loadingShare) return;
    setLoadingShare(true);
    setErrorShare(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/share/all-platforms?product_id=${product.id}`);
      if (!res.ok) throw new Error('Failed to fetch share links');
      setShareLinks(await res.json());
    } catch (e: unknown) {
      setErrorShare(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoadingShare(false);
    }
  };

  const handleShowQR = async () => {
    setQrModal(true);
    setQrUrl(`${API_BASE}/api/v1/share/qr-code?product_id=${product.id}`);
  };

  const handleShareClick = async (platform: 'whatsapp' | 'instagram' | 'tiktok') => {
    await fetchShareLinks();
    if (shareLinks?.[platform]?.url) {
      window.open(shareLinks[platform].url, '_blank', 'noopener');
    }
  };

  const handleAddToCart = async () => {
    setAdding(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart/add?tenant_id=${merchantId}&session_id=${session_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            quantity: 1,
            price_at_add: product.price,
            variant_id: null,
          }),
        },
      );
      if (!res.ok) throw new Error('Failed to add to cart');
      setSuccess(true);
      if (onAddToCart) onAddToCart();
      setTimeout(() => setSuccess(false), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className={styles.product.className}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={styles.product.imageContainer.className}
        style={styles.product.imageContainer.style}
      >
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.colors.secondary}15` }}
          >
            <span style={{ color: theme.colors.secondary }}>No image</span>
          </div>
        )}
      </div>
      <div className={styles.product.content.className}>
        <h3 style={styles.product.title.style}>{product.name}</h3>
        <p style={styles.product.description.style}>{product.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span style={styles.product.price.style}>${product.price.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            disabled={adding}
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.componentStyles.button.primary.text,
              borderRadius: theme.componentStyles.button.primary.borderRadius,
              padding: theme.componentStyles.button.primary.padding,
              border: 'none',
              transition: 'background-color 0.2s ease-in-out',
              opacity: adding ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                theme.componentStyles.button.primary.hoverBackground;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
            }}
          >
            {adding ? 'Adding...' : success ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
        {/* Share Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            title="Share QR"
            onClick={handleShowQR}
            className="p-2 rounded bg-gray-100 hover:bg-gray-200"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" stroke="#333" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" stroke="#333" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" stroke="#333" strokeWidth="2" />
              <rect x="14" y="14" width="3" height="3" stroke="#333" strokeWidth="2" />
            </svg>
          </button>
          <button
            title="Share WhatsApp"
            onClick={() => handleShareClick('whatsapp')}
            className="p-2 rounded bg-green-100 hover:bg-green-200"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M20.52 3.48A12 12 0 003.48 20.52l-1.44 5.28 5.28-1.44A12 12 0 0020.52 3.48z"
                stroke="#25D366"
                strokeWidth="2"
              />
              <path d="M16.24 7.76a6 6 0 11-8.48 8.48" stroke="#25D366" strokeWidth="2" />
            </svg>
          </button>
          <button
            title="Share Instagram"
            onClick={() => handleShareClick('instagram')}
            className="p-2 rounded bg-pink-100 hover:bg-pink-200"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="2" />
              <circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="2" />
              <circle cx="17" cy="7" r="1.5" fill="#E1306C" />
            </svg>
          </button>
          <button
            title="Share TikTok"
            onClick={() => handleShareClick('tiktok')}
            className="p-2 rounded bg-black hover:bg-gray-800"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M9 17a4 4 0 104 4v-7h3a5 5 0 01-5-5V3h3v6a2 2 0 002 2h2v3h-2a5 5 0 01-5 5v3z"
                stroke="#fff"
                strokeWidth="2"
              />
            </svg>
          </button>
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
        {loadingShare && <div className="mt-2 text-xs text-gray-400">Loading share links...</div>}
        {errorShare && <div className="mt-2 text-xs text-red-500">{errorShare}</div>}
      </div>
    </div>
  );
}
