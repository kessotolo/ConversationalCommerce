"use client";

import * as React from 'react';
import { Icon } from '@/components/icons';
import { LogOut, MessageCircle, Package, ShoppingBag, Store, User } from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserButton } from '@clerk/nextjs';

// Import icons
import { 
  Home, 
  Package, 
  ShoppingBag, 
  MessageCircle, 
  MoreHorizontal,
  LogOut,
  User,
  Store
} from 'lucide-react';

// Bottom navigation items - limited to 5 for mobile best practices
const bottomNavItems = [
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
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageCircle
  },
  {
    name: 'More',
    href: '/dashboard/settings',
    icon: MoreHorizontal
  }
];

export function MobileNav() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  // Only show navigation on dashboard pages
  if (!pathname?.startsWith('/dashboard')) {
    return null;
  }

  return (
    <>
      {/* Slide-up menu for account options */}
      {showMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMenu(false)}>
          <div 
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-xl shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-1 bg-gray-300 rounded-full mb-4"></div>
            
            <div className="space-y-4">
              <Link 
                href="/dashboard/storefront" 
                className="flex items-center p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowMenu(false)}
              >
                <Store className="h-5 w-5 mr-3 text-primary" />
                <span>Customize Storefront</span>
              </Link>
              
              <Link 
                href="/dashboard/account" 
                className="flex items-center p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowMenu(false)}
              >
                <User className="h-5 w-5 mr-3 text-primary" />
                <span>Seller Account</span>
              </Link>
              
              <div className="flex items-center p-3 hover:bg-gray-100 rounded-lg">
                <LogOut className="h-5 w-5 mr-3 text-red-500" />
                <span className="text-red-500">Sign Out</span>
                <div className="ml-auto">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16 px-1">
          {bottomNavItems.map((item) => {
            const isActive = 
              (item.href === '/dashboard' && pathname === '/dashboard') || 
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            
            // If this is the More button, show the menu instead of navigating
            if (item.name === 'More') {
              return (
                <button
                  key={item.name}
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex flex-col items-center justify-center w-full h-full relative"
                >
                  <div className={cn(
                    "flex flex-col items-center justify-center p-1 rounded-full",
                    showMenu ? "text-primary" : "text-gray-500"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6 mb-1",
                      showMenu ? "text-primary" : "text-gray-500"  
                    )} />
                    <span className="text-xs font-medium">{item.name}</span>
                  </div>
                  {showMenu && (
                    <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            }
            
            return (
              <Link 
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full relative"
              >
                <div className={cn(
                  "flex flex-col items-center justify-center p-1 rounded-full",
                  isActive ? "text-primary" : "text-gray-500"
                )}>
                  <Icon className={cn(
                    "h-6 w-6 mb-1",
                    isActive ? "text-primary" : "text-gray-500"  
                  )} />
                  <span className="text-xs font-medium">{item.name}</span>
                </div>
                {isActive && (
                  <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
