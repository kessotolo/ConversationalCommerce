'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { TopProducts } from '@/components/dashboard/TopProducts';
import { ChannelPerformance } from '@/components/dashboard/ChannelPerformance';
import { ShoppingBag, DollarSign, Users, ArrowUpRight } from 'lucide-react';

// Mock data - this would come from an API call in production
const mockSalesData = [
  { date: 'May 19', amount: 1200 },
  { date: 'May 20', amount: 1800 },
  { date: 'May 21', amount: 1400 },
  { date: 'May 22', amount: 2100 },
  { date: 'May 23', amount: 1900 },
  { date: 'May 24', amount: 2400 },
  { date: 'May 25', amount: 2200 },
];

const mockRecentOrders = [
  {
    id: '1',
    customerName: 'John Doe',
    amount: 120.50,
    status: 'processing',
    date: '2025-05-25T10:30:00',
    phone: '+234 123 456 7890'
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    amount: 85.99,
    status: 'delivered',
    date: '2025-05-24T14:45:00',
    phone: '+234 987 654 3210'
  },
  {
    id: '3',
    customerName: 'Robert Johnson',
    amount: 210.75,
    status: 'pending',
    date: '2025-05-23T09:15:00'
  },
];

const mockTopProducts = [
  {
    id: '1',
    name: 'Wireless Earbuds',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    price: 49.99,
    soldCount: 28,
    revenue: 1399.72
  },
  {
    id: '2',
    name: 'Smart Watch',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    price: 129.99,
    soldCount: 16,
    revenue: 2079.84
  },
  {
    id: '3',
    name: 'Bluetooth Speaker',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    price: 79.99,
    soldCount: 22,
    revenue: 1759.78
  },
];

const mockChannelData = [
  {
    name: 'WhatsApp',
    orders: 42,
    revenue: 3240.50,
    conversion: 68
  },
  {
    name: 'Web',
    orders: 28,
    revenue: 2158.75,
    conversion: 45
  },
  {
    name: 'In-store',
    orders: 15,
    revenue: 1275.30,
    conversion: 82
  },
];

export default function Dashboard() {
  const [period, setPeriod] = useState<'7days' | '30days' | '90days'>('7days');

  return (
    <>
      <SignedIn>
        <DashboardLayout>
          <DashboardHeader 
            title="Dashboard" 
            subtitle="Overview of your store performance"
          />
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Orders"
              value="85"
              icon={<ShoppingBag className="h-5 w-5 text-primary" />}
              change={12}
              trend="up"
              subtitle="Last 30 days"
            />
            <StatCard
              title="Total Revenue"
              value="₦6,674.55"
              icon={<DollarSign className="h-5 w-5 text-primary" />}
              change={8}
              trend="up"
              subtitle="Last 30 days"
            />
            <StatCard
              title="Customers"
              value="63"
              icon={<Users className="h-5 w-5 text-primary" />}
              change={5}
              trend="up"
              subtitle="Last 30 days"
            />
            <StatCard
              title="Conversion Rate"
              value="54%"
              icon={<ArrowUpRight className="h-5 w-5 text-primary" />}
              change={-2}
              trend="down"
              subtitle="Last 30 days"
            />
          </div>
          
          {/* Sales Chart */}
          <div className="mb-6">
            <SalesChart data={mockSalesData} period={period} />
          </div>
          
          {/* 2-column layout for desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <RecentOrders orders={mockRecentOrders} />
            <TopProducts products={mockTopProducts} />
          </div>
          
          {/* Channel Performance */}
          <div className="mb-6">
            <ChannelPerformance data={mockChannelData} />
          </div>
        </DashboardLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}