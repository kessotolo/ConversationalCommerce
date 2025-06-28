// DEPRECATED: This Navbar is replaced by MobileNav.tsx for all new and existing layouts. Use <MobileNav /> instead for modern, mobile-first navigation.
'use client';

import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Define types for Cart and CartItem that were causing errors
interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price_at_add: number;
  image_url?: string;
}

interface Cart {
  items: CartItem[];
}

const API_BASE = process.env['NEXT_PUBLIC_API_BASE'] ?? '';

export default function Navbar() {
  const pathname = usePathname();
  const params = useParams();
  const { merchantId } = params as { merchantId?: string };
  const [cart, setCart] = useState<Cart | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session_id =
    typeof window !== 'undefined' ? (localStorage.getItem('session_id') ?? '') : '';

  useEffect(() => {
    if (merchantId) fetchCart();
    // eslint-disable-next-line
  }, [merchantId, drawerOpen]);

  async function fetchCart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart?tenant_id=${merchantId}&session_id=${session_id}`,
      );
      if (!res.ok) throw new Error('Failed to fetch cart');
      setCart(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const itemCount =
    cart?.items?.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) ?? 0;
  const subtotal =
    cart?.items?.reduce(
      (sum: number, item: CartItem) => sum + item.price_at_add * item.quantity,
      0,
    ) ?? 0;

  // Only show navbar on public pages, not on dashboard
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  return (
    <nav className="bg-background border-b border-[#A8D5BA]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold text-[#6C9A8B]">
              Conversational Commerce
            </Link>
          </div>

          <div className="flex items-center">
            {/* Remove all unused variables/imports: 'user' */}
          </div>

          <div className="relative">
            <button
              className="relative p-2 rounded hover:bg-gray-100"
              onClick={() => setDrawerOpen(true)}
              aria-label="View cart"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="ml-auto w-full max-w-sm h-full bg-white shadow-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : !cart?.items || cart.items.length === 0 ? (
              <div className="text-center py-8">Your cart is empty.</div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                  {cart.items.map((item: CartItem) => (
                    <div key={item.id} className="flex items-center gap-3 border-b pb-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{item.name}</div>
                        <div className="text-gray-500 text-sm">${item.price_at_add.toFixed(2)}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-8 text-center">{item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Subtotal</span>
                    <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
                  </div>
                  <Link
                    href={merchantId ? `/store/${merchantId}/cart` : '#'}
                    className="w-full mt-2 py-2 rounded bg-[#6C9A8B] text-white font-semibold text-center hover:bg-[#4e6e5e]"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Go to Cart
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
