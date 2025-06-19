'use client';

import { useState } from 'react';

import { getEventBus } from '@/modules/order/events/EventBus';
import { OrderEventFactory } from '@/modules/order/models/events/orderEvents';
import type { Order } from '@/modules/order/models/order';
import type { CreateOrderRequest } from '@/modules/order/validation/orderSchema';

import { useOrderService } from './useOrderService';

interface CreateOrderOptions {
  /**
   * Whether to publish order events after successful creation
   */
  publishEvents?: boolean;
}

interface CreateOrderState {
  /**
   * The order being created
   */
  order: Order | null;
  /**
   * Whether the creation is in progress
   */
  isLoading: boolean;
  /**
   * Any error that occurred during creation
   */
  error: Error | null;
  /**
   * Whether the creation was successful
   */
  isSuccess: boolean;
}

/**
 * Hook for creating orders with proper event publishing
 */
export function useCreateOrder(options: CreateOrderOptions = {}) {
  const { publishEvents = true } = options;
  const orderService = useOrderService();
  const [state, setState] = useState<CreateOrderState>({
    order: null,
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  /**
   * Create a new order and optionally publish events
   */
  const createOrder = async (request: CreateOrderRequest) => {
    setState({
      order: null,
      isLoading: true,
      error: null,
      isSuccess: false,
    });

    try {
      // Ensure we have an idempotency key to prevent duplicates
      if (!request.idempotency_key) {
        request.idempotency_key = crypto.randomUUID();
      }

      // Create the order via the service
      const result = await orderService.createOrder(request);

      if (!result.success || !result.data) {
        setState({
          order: null,
          isLoading: false,
          error: result.error || new Error('Failed to create order'),
          isSuccess: false,
        });
        return null;
      }

      // Successfully created order
      const newOrder = result.data;
      setState({
        order: newOrder,
        isLoading: false,
        error: null,
        isSuccess: true,
      });

      // Publish order created event if enabled
      if (publishEvents) {
        const eventBus = getEventBus();
        const event = OrderEventFactory.createOrderCreatedEvent(newOrder);
        await eventBus.publish(event);
      }

      return newOrder;
    } catch (error) {
      setState({
        order: null,
        isLoading: false,
        error: error as Error,
        isSuccess: false,
      });
      return null;
    }
  };

  /**
   * Reset the state of the hook
   */
  const reset = () => {
    setState({
      order: null,
      isLoading: false,
      error: null,
      isSuccess: false,
    });
  };

  return {
    ...state,
    createOrder,
    reset,
  };
}
