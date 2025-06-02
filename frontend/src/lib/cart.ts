/**
 * @deprecated This file is kept for backward compatibility.
 * Please import from '@cart/services' in new code.
 */

import { useCartStore } from '@/modules/cart/services';
import type { CartItem } from '@/modules/cart';

// Re-export the cart store and types for backward compatibility
export type { CartItem };
export const useCart = useCartStore;
