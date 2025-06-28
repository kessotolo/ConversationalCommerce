'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Order, OrderStatus } from '@/modules/order/models/order';
import { HttpOrderService } from '@/modules/order/services/OrderService';

/**
 * Order Context Interface
 * Provides centralized state management for orders throughout the application.
 * Following the orchestrator pattern, this context delegates operations to
 * specialized services while maintaining the global state.
 * 
 * @interface OrderContextType
 */
interface OrderContextType {
  /**
   * Current list of orders retrieved from the backend
   */
  orders: Order[];
  
  /**
   * IDs of orders currently selected by the user
   */
  selectedOrders: string[];
  
  /**
   * Indicates whether any async operation is in progress
   */
  isLoading: boolean;
  
  /**
   * Error message if any operation has failed, or null if no error
   */
  error: string | null;
  
  /**
   * Loads all orders for a given tenant
   * @param tenantId - The ID of the tenant to load orders for
   */
  loadOrders: (tenantId: string) => Promise<void>;
  
  /**
   * Updates the status of a specific order
   * @param orderId - The ID of the order to update
   * @param status - The new status to assign to the order
   * @param tenantId - The ID of the tenant the order belongs to
   */
  updateOrderStatus: (orderId: string, status: OrderStatus, tenantId: string) => Promise<void>;
  
  /**
   * Toggles selection of a specific order
   * @param orderId - The ID of the order to toggle selection for
   */
  toggleSelectOrder: (orderId: string) => void;
  
  /**
   * Toggles selection of all currently visible orders
   */
  toggleSelectAll: () => void;
  
  /**
   * Clears all selected orders
   */
  clearSelection: () => void;
  
  /**
   * Initiates communication with a customer
   * @param phone - The customer's phone number
   */
  messageCustomer: (phone: string) => void;
  
  /**
   * Deletes all currently selected orders
   * @param tenantId - The ID of the tenant the orders belong to
   */
  deleteSelectedOrders: (tenantId: string) => Promise<void>;
}

/**
 * React Context for order management
 * Initial value is undefined and will be provided by the OrderProvider
 */
const OrderContext = createContext<OrderContextType | undefined>(undefined);

/**
 * Service instance for order operations
 * Using a singleton pattern for the service to maintain consistency
 * Can be mocked/replaced for testing purposes
 */
const orderService = new HttpOrderService();

/**
 * Order Provider Component
 * Provides the OrderContext to all child components and handles the state management
 * for order-related operations following the orchestrator pattern.
 * 
 * @param props - Component props
 * @param props.children - Child components that will have access to the OrderContext
 */
export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load orders for a tenant
   * Fetches all orders for the specified tenant, updates state, and handles errors
   * 
   * @param tenantId - The ID of the tenant to load orders for
   */
  const loadOrders = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await orderService.getOrders({ tenantId });
      if (result.success && result.data) {
        setOrders(result.data.items);
      } else {
        setError(result.error?.message || 'Failed to load orders');
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update the status of an order
   * Updates the status of a specific order and handles optimistic UI updates
   * 
   * @param orderId - The ID of the order to update
   * @param status - The new status to assign to the order
   * @param tenantId - The ID of the tenant the order belongs to
   */
  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, tenantId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await orderService.updateOrderStatus(orderId, status, tenantId);
        if (result.success && result.data) {
          // Update the local state with the updated order
          setOrders((prevOrders) =>
            prevOrders.map((order) => (order.id === orderId ? { ...order, status } : order))
          );
        } else {
          setError(result.error?.message || `Failed to update order ${orderId}`);
        }
      } catch (err) {
        setError((err as Error).message || 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Toggle selection of a single order
   * Adds or removes an order from the selection based on its current state
   * 
   * @param orderId - The ID of the order to toggle selection for
   */
  const toggleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  }, []);

  /**
   * Toggle selection of all orders
   * If all orders are currently selected, deselects all
   * If some or no orders are selected, selects all
   */
  const toggleSelectAll = useCallback(() => {
    setSelectedOrders((prev) =>
      prev.length === orders.length ? [] : orders.map((order) => order.id)
    );
  }, [orders]);

  /**
   * Clear all selections
   * Removes all orders from the current selection
   */
  const clearSelection = useCallback(() => {
    setSelectedOrders([]);
  }, []);

  /**
   * Message a customer
   * Initiates communication with a customer using their phone number
   * 
   * @param phone - The customer's phone number to send a message to
   */
  const messageCustomer = useCallback((phone: string) => {
    // Implementation will depend on integration with messaging system
    console.log(`Messaging customer at ${phone}`);
    // In production, this would trigger a messaging service
  }, []);

  /**
   * Delete selected orders
   * Deletes all currently selected orders and updates the UI accordingly
   * 
   * @param tenantId - The ID of the tenant the orders belong to
   */
  const deleteSelectedOrders = useCallback(
    async (tenantId: string) => {
      if (selectedOrders.length === 0) return;

      setIsLoading(true);
      setError(null);
      try {
        const result = await orderService.deleteOrders(selectedOrders, tenantId);
        if (result.success) {
          // Update local state by removing deleted orders
          setOrders((prevOrders) => 
            prevOrders.filter((order) => !selectedOrders.includes(order.id))
          );
          // Clear selection after deletion
          setSelectedOrders([]);
        } else {
          setError(result.error?.message || 'Failed to delete selected orders');
        }
      } catch (err) {
        setError((err as Error).message || 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [selectedOrders]
  );

  // Create context value object
  const value = useMemo(
    () => ({
      orders,
      selectedOrders,
      isLoading,
      error,
      loadOrders,
      updateOrderStatus,
      toggleSelectOrder,
      toggleSelectAll,
      clearSelection,
      messageCustomer,
      deleteSelectedOrders,
    }),
    [
      orders,
      selectedOrders,
      isLoading,
      error,
      loadOrders,
      updateOrderStatus,
      toggleSelectOrder,
      toggleSelectAll,
      clearSelection,
      messageCustomer,
      deleteSelectedOrders,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

/**
 * Custom hook to use the order context
 * Provides access to the OrderContext with appropriate error handling
 * 
 * @throws Error if used outside of an OrderProvider
 * @returns The OrderContext value
 */
export function useOrderContext() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
}
