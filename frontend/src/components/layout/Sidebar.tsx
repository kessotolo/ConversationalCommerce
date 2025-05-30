import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserButton } from '@clerk/nextjs';
import {
  Home,
  Package,
  ShoppingBag,
  BarChart,
  MessageCircle,
  Settings,
  Store,
  User,
  Users
} from 'lucide-react';
import SettingsDrawer from '@/components/dashboard/SettingsDrawer';

const navItems = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: Home
  },
  {
    name: 'Products',
    href: '/dashboard/products',
    icon: Package
  },
  {
    name: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingBag
  },
  {
    name: 'Customers',
    href: '/dashboard/customers',
    icon: Users
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageCircle
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Only highlight the Storefront link if on /dashboard/storefront or its subpages
  const isStorefrontActive = pathname === '/dashboard/storefront' || pathname?.startsWith('/dashboard/storefront/');

  return (
    <>
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-[#f8fafb] border-r border-gray-200 font-sans">
        <div className="flex-1 flex flex-col min-h-0 pt-6">
          {/* Logo/Brand */}
          <div className="flex items-center h-16 px-6 mb-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="inline-block w-8 h-8 rounded-full bg-[#6C9A8B] text-white font-bold flex items-center justify-center text-lg">CC</span>
              <span className="text-xl font-bold text-gray-900 tracking-tight">ConvoCommerce</span>
            </Link>
          </div>
          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                if (item.name === 'Settings') {
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all w-full text-left",
                        pathname === '/dashboard/settings'
                          ? "bg-[#e8f6f1] text-[#6C9A8B] shadow"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Settings className={cn("mr-3 flex-shrink-0 h-5 w-5", pathname === '/dashboard/settings' ? "text-[#6C9A8B]" : "text-gray-400 group-hover:text-gray-700")} />
                      {item.name}
                    </button>
                  );
                }
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all",
                      isActive
                        ? "bg-[#e8f6f1] text-[#6C9A8B] shadow"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 flex-shrink-0 h-5 w-5",
                        isActive ? "text-[#6C9A8B]" : "text-gray-400 group-hover:text-gray-700"
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            {/* Section Divider */}
            <div className="border-t border-gray-200 my-4" />
            {/* Storefront Link */}
            <Link
              href="/dashboard/storefront"
              className={cn(
                "flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all",
                isStorefrontActive
                  ? "text-[#6C9A8B] bg-[#e8f6f1] shadow"
                  : "text-[#6C9A8B] hover:bg-[#d1ede2]"
              )}
            >
              <Store className="mr-3 flex-shrink-0 h-5 w-5" />
              Customize Storefront
            </Link>
          </nav>
          {/* User/Account Info */}
          <div className="flex-shrink-0 flex flex-col border-t border-gray-200 p-4 mt-4">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Seller Account</p>
                <p className="text-xs text-gray-500">Sign out →</p>
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </aside>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
