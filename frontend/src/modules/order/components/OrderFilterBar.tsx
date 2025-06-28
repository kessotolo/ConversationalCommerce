'use client';

import { Search } from 'lucide-react';
import { OrderStatus } from '@/modules/order/models/order';

/**
 * Props for the OrderFilterBar component
 * 
 * @interface OrderFilterBarProps
 * @property {string} statusFilter - Current status filter value
 * @property {function} setStatusFilter - Function to update status filter
 * @property {string} searchTerm - Current search term
 * @property {function} setSearchTerm - Function to update search term
 * @property {object} ordersCount - Count of orders by status
 */
interface OrderFilterBarProps {
  /** Current status filter value ('all', 'pending', 'processing', etc.) */
  statusFilter: string;
  
  /** Function to update the status filter */
  setStatusFilter: (status: string) => void;
  
  /** Current search term for filtering orders */
  searchTerm: string;
  
  /** Function to update the search term */
  setSearchTerm: (term: string) => void;
  
  /** Count of orders by status category for badge display */
  ordersCount: {
    /** Total count of all orders */
    all: number;
    /** Count of orders with pending status */
    pending: number;
    /** Count of orders with processing status */
    processing: number;
    /** Count of orders with shipped status */
    shipped: number;
    /** Count of orders with delivered status */
    delivered: number;
    /** Count of orders with cancelled status */
    cancelled: number;
  };
}

/**
 * OrderFilterBar Component
 * Provides filtering and search capabilities for the orders list.
 * Includes status filter tabs with count badges and a search input field.
 * 
 * @param {OrderFilterBarProps} props - Component props
 * @returns {JSX.Element} Rendered filter bar with status tabs and search input
 */
export function OrderFilterBar({
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  ordersCount,
}: OrderFilterBarProps) {
  return (
    <>
      {/* 
      * Order Status Tabs
      * Each tab shows a count badge with the number of orders in that status
      * The active tab is highlighted with primary color
      */}
      <div className="border-b mb-6 overflow-x-auto pb-px">
        <div className="flex whitespace-nowrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${
              statusFilter === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Orders
            <span className="ml-2 bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full text-xs">
              {ordersCount.all}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${
              statusFilter === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending
            <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs">
              {ordersCount.pending}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${
              statusFilter === 'processing'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Processing
            <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs">
              {ordersCount.processing}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('shipped')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${
              statusFilter === 'shipped'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shipped
            <span className="ml-2 bg-purple-100 text-purple-800 py-0.5 px-2 rounded-full text-xs">
              {ordersCount.shipped}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${
              statusFilter === 'delivered'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Delivered
            <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2 rounded-full text-xs">
              {ordersCount.delivered}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${
              statusFilter === 'cancelled'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cancelled
            <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs">
              {ordersCount.cancelled}
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search orders by customer name, order number, or phone number..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
    </>
  );
}
