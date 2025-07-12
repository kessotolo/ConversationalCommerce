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
  X,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

import { cn } from '@/lib/utils';

// Bottom navigation items - limited to 5 for mobile best practices
const bottomNavItems = [
  {
    name: 'Home',
    href: '/dashboard' as const,
    icon: Home,
  },
  {
    name: 'Orders',
    href: '/dashboard/orders' as const,
    icon: ShoppingBag,
  },
  {
    name: 'Products',
    href: '/dashboard/products' as const,
    icon: Package,
  },
  {
    name: 'Messages',
    href: '/dashboard/messages' as const,
    icon: MessageCircle,
  },
  {
    name: 'More',
    href: null,
    icon: MoreHorizontal,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { user } = useUser();

  // Only show navigation on dashboard pages
  if (!pathname?.startsWith('/dashboard')) {
    return null;
  }

  // Handle menu toggle with animation
  const handleMenuToggle = () => {
    if (showMenu) {
      setIsAnimating(true);
      setTimeout(() => {
        setShowMenu(false);
        setIsAnimating(false);
      }, 200);
    } else {
      setShowMenu(true);
    }
  };

  // Handle navigation and close menu
  const handleNav = (href: string) => {
    handleMenuToggle();
    setTimeout(() => {
      if (router) {
        router.push(href as any);
      }
    }, 200);
  };

  // Handle sign out
  const handleSignOut = () => {
    handleMenuToggle();
    setTimeout(() => {
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
    }, 200);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && !(event.target as Element).closest('[data-menu-content]')) {
        handleMenuToggle();
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <>
      {/* Enhanced More Sheet/Modal */}
      {showMenu && (
        <div
          className={cn(
            'md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all duration-300',
            showMenu && !isAnimating ? 'opacity-100' : 'opacity-0'
          )}
          onClick={handleMenuToggle}
        >
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl p-6 pb-8 transition-all duration-300 transform',
              showMenu && !isAnimating ? 'translate-y-0' : 'translate-y-full'
            )}
            onClick={(e) => e.stopPropagation()}
            data-menu-content
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
          >
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 id="mobile-menu-title" className="text-lg font-semibold text-gray-900">
                Menu
              </h2>
              <button
                onClick={handleMenuToggle}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* User Profile Section */}
            <div className="flex flex-col items-center gap-3 mb-8 p-4 bg-[#f7faf9] rounded-2xl border border-[#e6f0eb]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#6C9A8B] to-[#5d8a7b] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || 'U'}
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 text-lg truncate max-w-[200px]">
                  {user?.firstName || 'User'}
                </div>
                <div className="text-sm text-gray-600 truncate max-w-[200px]">
                  {user?.primaryEmailAddress?.emailAddress || 'user@example.com'}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-2 mb-6">
              <button
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 bg-gray-50 hover:bg-[#e8f6f1] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => handleNav('/dashboard/profile')}
              >
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <User className="h-5 w-5 text-[#6C9A8B]" />
                </div>
                <span>Profile</span>
                <ChevronUp className="h-4 w-4 text-gray-400 ml-auto rotate-90" />
              </button>

              <button
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 bg-gray-50 hover:bg-[#e8f6f1] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => handleNav('/dashboard/storefront')}
              >
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Store className="h-5 w-5 text-[#6C9A8B]" />
                </div>
                <span>Customize Storefront</span>
                <ChevronUp className="h-4 w-4 text-gray-400 ml-auto rotate-90" />
              </button>

              <button
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 bg-gray-50 hover:bg-[#e8f6f1] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => handleNav('/dashboard/settings')}
              >
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Settings className="h-5 w-5 text-[#6C9A8B]" />
                </div>
                <span>Settings</span>
                <ChevronUp className="h-4 w-4 text-gray-400 ml-auto rotate-90" />
              </button>

              <button
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleSignOut}
              >
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <LogOut className="h-5 w-5 text-red-500" />
                </div>
                <span>Sign Out</span>
                <ChevronUp className="h-4 w-4 text-red-400 ml-auto rotate-90" />
              </button>
            </div>

            {/* Footer */}
            <div className="text-center">
              <button
                className="text-gray-400 text-sm underline hover:text-gray-600 transition-colors"
                onClick={handleMenuToggle}
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Main Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/50 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2 safe-area-inset-bottom">
          {bottomNavItems.map((item) => {
            const isActive =
              (item.href === '/dashboard' && pathname === '/dashboard') ||
              (item.href !== '/dashboard' && item.href !== null && pathname?.startsWith(item.href));
            const Icon = item.icon;

            // Special handling for "More" button
            if (item.name === 'More') {
              return (
                <button
                  key={item.name}
                  onClick={handleMenuToggle}
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-full relative',
                    'transition-all duration-200 hover:scale-105 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] focus:ring-opacity-50 rounded-lg'
                  )}
                  aria-label={item.name}
                >
                  <div className="flex flex-col items-center justify-center p-2">
                    <Icon
                      className={cn(
                        'h-6 w-6 mb-1 transition-colors duration-200',
                        showMenu ? 'text-[#6C9A8B]' : 'text-gray-500'
                      )}
                    />
                    <span className={cn(
                      'text-xs font-medium transition-colors duration-200',
                      showMenu ? 'text-[#6C9A8B]' : 'text-gray-500'
                    )}>
                      {item.name}
                    </span>
                  </div>
                  {showMenu && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full bg-[#6C9A8B] transition-all duration-200" />
                  )}
                </button>
              );
            }

            // Regular navigation items
            return (
              <Link
                key={item.name}
                href={item.href!}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full relative',
                  'transition-all duration-200 hover:scale-105 active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] focus:ring-opacity-50 rounded-lg'
                )}
                aria-label={item.name}
              >
                <div className="flex flex-col items-center justify-center p-2">
                  <Icon
                    className={cn(
                      'h-6 w-6 mb-1 transition-colors duration-200',
                      isActive ? 'text-[#6C9A8B]' : 'text-gray-500'
                    )}
                  />
                  <span className={cn(
                    'text-xs font-medium transition-colors duration-200',
                    isActive ? 'text-[#6C9A8B]' : 'text-gray-500'
                  )}>
                    {item.name}
                  </span>
                </div>
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full bg-[#6C9A8B] transition-all duration-200" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
