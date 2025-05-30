import * as React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url: string | null;
}

interface CartStore {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) => {
                const currentItems = get().items;
                const existingItem = currentItems.find((i) => i.id === item.id);

                if (existingItem) {
                    set({
                        items: currentItems.map((i) =>
                            i.id === item.id
                                ? { ...i, quantity: i.quantity + 1 }
                                : i
                        ),
                    });
                } else {
                    set({ items: [...currentItems, { ...item, quantity: 1 }] });
                }
            },

            removeItem: (itemId) => {
                set({
                    items: get().items.filter((item) => item.id !== itemId),
                });
            },

            updateQuantity: (itemId, quantity) => {
                if (quantity < 1) {
                    get().removeItem(itemId);
                    return;
                }

                set({
                    items: get().items.map((item) =>
                        item.id === itemId ? { ...item, quantity } : item
                    ),
                });
            },

            clearCart: () => {
                set({ items: [] });
            },

            getTotal: () => {
                return get().items.reduce(
                    (total, item) => total + item.price * item.quantity,
                    0
                );
            },

            getItemCount: () => {
                return get().items.reduce(
                    (count, item) => count + item.quantity,
                    0
                );
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);