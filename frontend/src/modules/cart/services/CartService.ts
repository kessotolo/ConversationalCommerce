import type { CartItem } from '@/modules/cart/models/cart';

type UUID = string;

/**
 * Interface for the cart service
 */
export interface CartService {
  getItems(): CartItem[];
  addItem(item: Omit<CartItem, 'id' | 'quantity'>): void;
  removeItem(itemId: UUID): void;
  updateQuantity(itemId: UUID, quantity: number): void;
  clearCart(): void;
  getTotal(): number;
  getItemCount(): number;
}

/**
 * Implementation of the cart service using local storage
 * Includes offline resilience with local storage persistence
 */
export class LocalStorageCartService implements CartService {
  private storage: Storage | null;
  private storageKey: string;
  private items: CartItem[];

  constructor(storageKey = 'cart_items') {
    this.storageKey = storageKey;
    this.storage = typeof window !== 'undefined' ? window.localStorage : null;
    this.items = this.loadItems();
  }

  private loadItems(): CartItem[] {
    if (!this.storage) return [];

    try {
      const storedItems = this.storage.getItem(this.storageKey);
      return storedItems ? JSON.parse(storedItems) : [];
    } catch (error) {
      if (typeof console !== 'undefined')
        console.error('Failed to load cart items from storage:', error);
      return [];
    }
  }

  private saveItems(): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (error) {
      if (typeof console !== 'undefined')
        console.error('Failed to save cart items to storage:', error);
    }
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  addItem(item: Omit<CartItem, 'quantity'>): void {
    const existingItem = this.items.find((i) => i.id === item.id);

    if (existingItem) {
      this.items = this.items.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
      );
    } else {
      this.items = [...this.items, { ...item, quantity: 1 }];
    }

    this.saveItems();
  }

  removeItem(itemId: UUID): void {
    this.items = this.items.filter((item) => item.id !== itemId);
    this.saveItems();
  }

  updateQuantity(itemId: UUID, quantity: number): void {
    if (quantity < 1) {
      this.removeItem(itemId);
      return;
    }

    this.items = this.items.map((item) => (item.id === itemId ? { ...item, quantity } : item));

    this.saveItems();
  }

  clearCart(): void {
    this.items = [];
    this.saveItems();
  }

  getTotal(): number {
    return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  getItemCount(): number {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }
}
