'use client';

import { useAuth } from '@/utils/auth-utils';
import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { TopProducts } from '@/components/dashboard/TopProducts';
import { ChannelPerformance } from '@/components/dashboard/ChannelPerformance';
import { ShoppingBag, DollarSign, Users, ArrowUpRight, PlusCircle, BarChart3, CheckCircle, ChevronRight } from 'lucide-react';
import SettingsDrawer from '@/components/dashboard/SettingsDrawer';

// Define types to match component requirements
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  customerName: string;
  amount: number;
  status: OrderStatus;
  date: string;
  phone?: string;
}

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

const mockRecentOrders: Order[] = [
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

// Mock messages data
const mockMessages = [
  {
    id: '1',
    sender: 'Jane Smith',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    time: '2m ago',
    content: 'Order #1234 has been shipped! 🎉',
  },
  {
    id: '2',
    sender: 'John Doe',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    time: '10m ago',
    content: 'New message from a customer: "Can I get a discount on bulk?"',
  },
  {
    id: '3',
    sender: 'Support',
    avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
    time: '1h ago',
    content: 'Your payout for May is being processed.',
  },
];

function OnboardingChecklist({ onOpenSettings }: { onOpenSettings: (section: string) => void }) {
  // Mock completion state
  const steps = [
    {
      key: 'addProduct',
      label: 'Add your first product',
      complete: false,
      action: <Link href="/dashboard/products/add" className="text-[#6C9A8B] font-semibold hover:underline flex items-center">Add Product <ChevronRight className="ml-1 h-4 w-4" /></Link>
    },
    {
      key: 'storeDetails',
      label: 'Set up store details',
      complete: true,
      action: <button onClick={() => onOpenSettings('general')} className="text-[#6C9A8B] font-semibold hover:underline flex items-center">Edit Details <ChevronRight className="ml-1 h-4 w-4" /></button>
    },
    {
      key: 'payments',
      label: 'Configure payments',
      complete: false,
      action: <button onClick={() => onOpenSettings('billing')} className="text-[#6C9A8B] font-semibold hover:underline flex items-center">Set Up <ChevronRight className="ml-1 h-4 w-4" /></button>
    },
    {
      key: 'logo',
      label: 'Add a store logo',
      complete: true,
      action: <button onClick={() => onOpenSettings('general')} className="text-[#6C9A8B] font-semibold hover:underline flex items-center">Upload Logo <ChevronRight className="ml-1 h-4 w-4" /></button>
    },
    {
      key: 'notifications',
      label: 'Set up notifications',
      complete: false,
      action: <button onClick={() => onOpenSettings('notifications')} className="text-[#6C9A8B] font-semibold hover:underline flex items-center">Configure <ChevronRight className="ml-1 h-4 w-4" /></button>
    },
    {
      key: 'users',
      label: 'Invite team members',
      complete: false,
      action: <button onClick={() => onOpenSettings('users')} className="text-[#6C9A8B] font-semibold hover:underline flex items-center">Invite <ChevronRight className="ml-1 h-4 w-4" /></button>
    },
    {
      key: 'domains',
      label: 'Connect a domain',
      complete: false,
      action: <button onClick={() => onOpenSettings('domains')} className="text-[#6C9A8B] font-semibold hover:underline flex items-center">Connect <ChevronRight className="ml-1 h-4 w-4" /></button>
    }
  ];
  // Prioritize incomplete steps, randomize order for incomplete
  const incomplete = steps.filter(s => !s.complete);
  const complete = steps.filter(s => s.complete);
  const randomized = [...incomplete.sort(() => Math.random() - 0.5), ...complete];
  const progress = steps.filter(s => s.complete).length;
  return (
    <div className="bg-white rounded-2xl border border-[#e6f0eb] shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Get ready to sell</h2>
        <span className="text-xs text-gray-500">{progress} of {steps.length} complete</span>
      </div>
      <div className="w-full bg-[#f5f9f7] rounded-full h-2 mb-6">
        <div className="bg-[#6C9A8B] h-2 rounded-full transition-all" style={{ width: `${(progress / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-3">
        {randomized.map((step, idx) => (
          <li key={step.key} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              {step.complete ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <span className="inline-block h-5 w-5 rounded-full border-2 border-[#e6f0eb] group-hover:border-[#6C9A8B]" />
              )}
              <span className={step.complete ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}>{step.label}</span>
            </div>
            <div>{!step.complete && step.action}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<'7days' | '30days' | '90days'>('7days');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Optionally, track which section to open in settings
  // const [settingsSection, setSettingsSection] = useState<string | null>(null);

  const { isLoading, isAuthenticated } = useAuth();

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C9A8B]"></div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (!isAuthenticated) {
    // Will be handled by the auth utility's redirect
    return null;
  }

  return (
    <DashboardLayout>
          <div className="min-h-screen bg-[#fdfcf7] py-6 px-2 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">Dashboard</h1>
                <p className="text-gray-500 text-base">Overview of your store performance</p>
              </div>
              {/* Period Selector */}
              <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#f5f5f5] p-1 rounded-full shadow-sm">
                <button
                  onClick={() => setPeriod('7days')}
                  className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${period === '7days' ? 'bg-[#6C9A8B] text-white shadow' : 'text-gray-600 hover:bg-[#e6f0eb]'}`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setPeriod('30days')}
                  className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${period === '30days' ? 'bg-[#6C9A8B] text-white shadow' : 'text-gray-600 hover:bg-[#e6f0eb]'}`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setPeriod('90days')}
                  className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${period === '90days' ? 'bg-[#6C9A8B] text-white shadow' : 'text-gray-600 hover:bg-[#e6f0eb]'}`}
                >
                  90 Days
                </button>
              </div>
            </div>

            {/* Onboarding Checklist */}
            <OnboardingChecklist onOpenSettings={() => setSettingsOpen(true)} />

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8 relative">
              <Link href="/dashboard/products/add" className="hidden sm:inline-flex bg-[#6C9A8B] text-white px-5 py-2 rounded-full text-sm font-semibold items-center shadow hover:bg-[#5d8a7b] transition-all ml-auto">
                <PlusCircle className="mr-2 h-5 w-5" /> Add Product
              </Link>
              <Link href="/dashboard/orders" className="bg-white border border-[#e6f0eb] text-[#6C9A8B] px-5 py-2 rounded-full text-sm font-semibold flex items-center shadow-sm hover:bg-[#f5f9f7] transition-all">
                <ShoppingBag className="mr-2 h-4 w-4" /> View Orders
              </Link>
              <Link href="/dashboard/analytics" className="bg-white border border-[#e6f0eb] text-[#6C9A8B] px-5 py-2 rounded-full text-sm font-semibold flex items-center shadow-sm hover:bg-[#f5f9f7] transition-all">
                <BarChart3 className="mr-2 h-4 w-4" /> Analytics
              </Link>
            </div>

            {/* Floating Add Product Button (Mobile) */}
            <Link href="/dashboard/products/add" className="sm:hidden fixed bottom-6 right-6 z-50 bg-[#6C9A8B] text-white rounded-full shadow-lg p-4 flex items-center justify-center hover:bg-[#5d8a7b] transition-all">
              <PlusCircle className="h-7 w-7" />
              <span className="sr-only">Add Product</span>
            </Link>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
                <StatCard
                  title="Total Orders"
                  value="85"
                  icon={<ShoppingBag className="h-5 w-5 text-[#6C9A8B]" />}
                  change={12}
                  trend="up"
                  subtitle="Last 30 days"
                />
              </div>
              <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
                <StatCard
                  title="Total Revenue"
                  value="₦6,674.55"
                  icon={<DollarSign className="h-5 w-5 text-[#6C9A8B]" />}
                  change={8}
                  trend="up"
                  subtitle="Last 30 days"
                />
              </div>
              <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
                <StatCard
                  title="Customers"
                  value="63"
                  icon={<Users className="h-5 w-5 text-[#6C9A8B]" />}
                  change={5}
                  trend="up"
                  subtitle="Last 30 days"
                />
              </div>
              <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
                <StatCard
                  title="Conversion Rate"
                  value="54%"
                  icon={<ArrowUpRight className="h-5 w-5 text-[#6C9A8B]" />}
                  change={-2}
                  trend="down"
                  subtitle="Last 30 days"
                />
              </div>
            </div>

            {/* Social-style Messages Feed */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages & Activity</h2>
              <div className="flex flex-col gap-4">
                {mockMessages.map(msg => (
                  <div key={msg.id} className="bg-white rounded-xl shadow-sm border border-[#e6f0eb] p-4 flex items-start gap-3">
                    <img src={msg.avatar} alt={msg.sender} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{msg.sender}</span>
                        <span className="text-xs text-gray-400">{msg.time}</span>
                      </div>
                      <div className="text-gray-700 text-sm">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales Chart */}
            <div className="mb-8 rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
              <SalesChart data={mockSalesData} period={period} />
            </div>

            {/* Data Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
                <RecentOrders orders={mockRecentOrders} />
              </div>
              <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
                <TopProducts products={mockTopProducts} />
              </div>
              <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
                <ChannelPerformance data={mockChannelData} />
              </div>
            </div>
          </div>
          {/* Mobile Bottom Nav */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg flex justify-around items-center py-2 z-50 sm:hidden">
            <Link href="/dashboard" className="flex flex-col items-center text-[#6C9A8B]">
              <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m5 0a2 2 0 002-2V7a2 2 0 00-2-2h-3.5a2 2 0 00-2 2v1" /></svg>
              <span className="text-xs">Home</span>
            </Link>
            <Link href="/dashboard/orders" className="flex flex-col items-center text-gray-400">
              <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
              <span className="text-xs">Orders</span>
            </Link>
            <Link href="/dashboard/products" className="flex flex-col items-center text-gray-400">
              <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0H4" /></svg>
              <span className="text-xs">Products</span>
            </Link>
            <Link href="/dashboard/messages" className="flex flex-col items-center text-gray-400">
              <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              <span className="text-xs">Messages</span>
            </Link>
            <Link href="/dashboard/profile" className="flex flex-col items-center text-gray-400">
              <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              <span className="text-xs">Profile</span>
            </Link>
          </div>
        </DashboardLayout>
  );
}