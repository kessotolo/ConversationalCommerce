'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price_at_add: number;
  quantity: number;
  image_url: string | null;
  variant_id?: string | null;
}

export default function CartPage() {
  const params = useParams();
  const { merchantId } = params as { merchantId: string };
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // TODO: Replace with real session/user/phone logic
  const session_id = typeof window !== 'undefined' ? localStorage.getItem('session_id') || '' : '';

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line
  }, [merchantId]);

  async function fetchCart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart?tenant_id=${merchantId}&session_id=${session_id}`,
      );
      if (!res.ok) throw new Error('Failed to fetch cart');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(product_id: string, variant_id: string | null, quantity: number) {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart/update?tenant_id=${merchantId}&session_id=${session_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id, quantity, variant_id }),
        },
      );
      if (!res.ok) throw new Error('Failed to update cart');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function removeItem(product_id: string, variant_id: string | null) {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart/remove?tenant_id=${merchantId}&session_id=${session_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id, variant_id }),
        },
      );
      if (!res.ok) throw new Error('Failed to remove item');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function clearCart() {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart/clear?tenant_id=${merchantId}&session_id=${session_id}`,
        {
          method: 'POST',
        },
      );
      if (!res.ok) throw new Error('Failed to clear cart');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading cart...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-4">Browse products and add them to your cart.</p>
      </div>
    );
  }

  const subtotal = cart.items.reduce(
    (sum: number, item: CartItem) => sum + item.price_at_add * item.quantity,
    0,
  );

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow mt-4">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      <div className="flex flex-col gap-4">
        {cart.items.map((item: CartItem) => (
          <div key={item.id} className="flex items-center gap-4 border-b pb-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
              {item.image_url ? (
                <Image src={item.image_url} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{item.name}</div>
              <div className="text-gray-500 text-sm">${item.price_at_add.toFixed(2)}</div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  disabled={updating || item.quantity <= 1}
                  onClick={() =>
                    updateQuantity(item.product_id, item.variant_id || null, item.quantity - 1)
                  }
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  disabled={updating}
                  onClick={() =>
                    updateQuantity(item.product_id, item.variant_id || null, item.quantity + 1)
                  }
                >
                  +
                </button>
                <button
                  className="ml-4 text-red-500 hover:underline text-sm"
                  disabled={updating}
                  onClick={() => removeItem(item.product_id, item.variant_id || null)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-6 mb-2">
        <span className="font-semibold">Subtotal</span>
        <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
      </div>
      <button
        className="w-full mt-4 py-2 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200"
        disabled={updating}
        onClick={clearCart}
      >
        Clear Cart
      </button>
    </div>
  );
}
