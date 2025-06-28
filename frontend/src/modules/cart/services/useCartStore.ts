import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CartItem } from '@/modules/cart/models/cart';
import { LocalStorageCartService } from '@/modules/cart/services/CartService';

// Define 'type UUID = string;' locally at the top of the file
type UUID = string;

/**
 * A Zustand store that wraps our CartService
 * Provides both reactive state and persistence
 */
interface CartStore {
  // State
  items: CartItem[];

  // Methods
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: UUID) => void;
  updateQuantity: (itemId: UUID, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

// Initialize the cart service as a singleton
const cartService = new LocalStorageCartService();

// Create the store with persistence for offline resilience
export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: cartService.getItems(),

      addItem: (item: Omit<CartItem, 'quantity'>) => {
        cartService.addItem(item);
        set({ items: cartService.getItems() });
      },

      removeItem: (itemId: UUID) => {
        cartService.removeItem(itemId);
        set({ items: cartService.getItems() });
      },

      updateQuantity: (itemId: UUID, quantity: number) => {
        cartService.updateQuantity(itemId, quantity);
        set({ items: cartService.getItems() });
      },

      clearCart: () => {
        cartService.clearCart();
        set({ items: [] });
      },

      getTotal: () => {
        return cartService.getTotal();
      },

      getItemCount: () => {
        return cartService.getItemCount();
      },
    }),
    {
      name: 'cart-storage',
      // Optionally add a custom partialize function to control what gets persisted
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
