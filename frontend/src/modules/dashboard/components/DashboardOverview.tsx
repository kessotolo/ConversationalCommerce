import React from 'react';
import { Users, ShoppingBag, DollarSign, Inbox } from 'lucide-react';

import type { DashboardStats } from '../hooks/useDashboardStats';
import useDashboardStats from '../hooks/useDashboardStats';

const DashboardOverview: React.FC = () => {
  const { totalUsers, totalOrders, totalRevenue, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error.message}</span>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="my-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Stats Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase tracking-wide mb-1">Total Users</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold">{totalUsers}</div>
            <Users className="w-8 h-8 ml-2 text-blue-500" />
          </div>
        </div>

        {/* Orders Stats Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase tracking-wide mb-1">Total Orders</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold">{totalOrders}</div>
            <ShoppingBag className="w-8 h-8 ml-2 text-green-500" />
          </div>
        </div>

        {/* Revenue Stats Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase tracking-wide mb-1">Total Revenue</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
            <DollarSign className="w-8 h-8 ml-2 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {totalUsers === 0 && totalOrders === 0 && totalRevenue === 0 && (
        <div className="mt-8 bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
          <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No data yet</h3>
          <p className="mt-2 text-gray-500">
            Your dashboard will populate as you onboard users and receive orders.
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
