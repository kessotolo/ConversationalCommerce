'use client';

import {
  Home,
  Package,
  ShoppingBag,
  MessageCircle,
  MoreHorizontal,
  Store,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

import { cn } from '@/lib/utils';

// Bottom navigation items - limited to 5 for mobile best practices
const bottomNavItems = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Products',
    href: '/dashboard/products',
    icon: Package,
  },
  {
    name: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingBag,
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageCircle,
  },
  {
    name: 'More',
    href: '#',
    icon: MoreHorizontal,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useUser();

  // Only show navigation on dashboard pages
  if (!pathname?.startsWith('/dashboard')) {
    return null;
  }

  // Handle navigation and close menu
  const handleNav = (href: string) => {
    setShowMenu(false);
    if (router) {
      router.push(href);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    setShowMenu(false);
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { Clerk?: { signOut?: () => void } }).Clerk?.signOut
    ) {
      const clerk = (window as unknown as { Clerk?: { signOut?: () => void } }).Clerk;
      if (clerk?.signOut) {
        clerk.signOut();
      }
    } else {
      if (router) {
        router.push('/');
      }
    }
  };

  return (
    <>
      {/* More sheet/modal */}
      {showMenu && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-40 flex items-end"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl shadow-2xl p-6 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#e8f6f1] flex items-center justify-center text-[#6C9A8B] font-bold text-xl">
                {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || 'U'}
              </div>
              <div className="font-semibold text-gray-900 text-base truncate max-w-[180px]">
                {user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Profile'}
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium text-gray-800 bg-gray-100 hover:bg-[#e8f6f1] transition"
                onClick={() => handleNav('/dashboard/profile')}
              >
                <User className="h-5 w-5 text-[#6C9A8B]" />
                Profile
              </button>
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium text-gray-800 bg-gray-100 hover:bg-[#e8f6f1] transition"
                onClick={() => handleNav('/dashboard/storefront')}
              >
                <Store className="h-5 w-5 text-[#6C9A8B]" />
                Customize Storefront
              </button>
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium text-gray-800 bg-gray-100 hover:bg-[#e8f6f1] transition"
                onClick={() => handleNav('/dashboard/settings')}
              >
                <Settings className="h-5 w-5 text-[#6C9A8B]" />
                Settings
              </button>
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium text-red-600 bg-gray-100 hover:bg-red-50 transition"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 text-red-500" />
                Sign Out
              </button>
            </div>
            <button
              className="w-full mt-2 text-gray-400 text-xs underline"
              onClick={() => setShowMenu(false)}
              aria-label="Close menu"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Main bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16 px-1">
          {bottomNavItems.map((item) => {
            const isActive =
              (item.href === '/dashboard' && pathname === '/dashboard') ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            if (item.name === 'More') {
              return (
                <button
                  key={item.name}
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex flex-col items-center justify-center w-full h-full relative focus:outline-none"
                  aria-label="More options"
                >
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center p-1 rounded-full',
                      showMenu ? 'text-[#6C9A8B]' : 'text-gray-500',
                    )}
                  >
                    <Icon
                      className={cn('h-6 w-6 mb-1', showMenu ? 'text-[#6C9A8B]' : 'text-gray-500')}
                    />
                    <span className="text-xs font-medium">{item.name}</span>
                  </div>
                  {showMenu && (
                    <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full bg-[#6C9A8B]" />
                  )}
                </button>
              );
            }
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full relative focus:outline-none"
                aria-label={item.name}
              >
                <div
                  className={cn(
                    'flex flex-col items-center justify-center p-1 rounded-full',
                    isActive ? 'text-[#6C9A8B]' : 'text-gray-500',
                  )}
                >
                  <Icon
                    className={cn('h-6 w-6 mb-1', isActive ? 'text-[#6C9A8B]' : 'text-gray-500')}
                  />
                  <span className="text-xs font-medium">{item.name}</span>
                </div>
                {isActive && (
                  <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full bg-[#6C9A8B]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
