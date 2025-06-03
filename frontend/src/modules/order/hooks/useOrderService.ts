'use client';

import { useContext } from 'react';
import { OrderService } from '../services/OrderService';
import { ServiceContext } from '@/modules/core/services/ServiceContext';

/**
 * Hook to access the OrderService instance
 * Ensures proper 'use client' directive for Next.js App Router
 */
export function useOrderService(): OrderService {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error('useOrderService must be used within a ServiceProvider');
  }

  const orderService = services.get('orderService') as OrderService;

  if (!orderService) {
    throw new Error('OrderService not found in ServiceContext');
  }

  return orderService;
}
