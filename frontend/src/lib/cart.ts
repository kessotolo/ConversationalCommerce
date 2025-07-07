import { useState, useCallback } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string | null;
}

export function useCart() {
    const [items, setItems] = useState<CartItem[]>([]);

    const addItem = useCallback((item: CartItem) => {
        setItems(prev => {
            const existingItem = prev.find(i => i.id === item.id);
            if (existingItem) {
                return prev.map(i =>
                    i.id === item.id
                        ? { ...i, quantity: i.quantity + item.quantity }
                        : i
                );
            }
            return [...prev, item];
        });
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const updateQuantity = useCallback((id: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id);
            return;
        }
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, quantity } : item
        ));
    }, [removeItem]);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
    };
}