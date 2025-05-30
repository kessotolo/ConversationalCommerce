import React from 'react';
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
  User
} from 'lucide-react';

const navItems = [
  {
    name: 'Dashboard',
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

  return (
    <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-background border-r">
      <div className="flex-1 flex flex-col min-h-0 pt-5">
        <div className="flex items-center h-16 px-4">
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold">SellerDash</span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon 
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex flex-col border-t p-4 space-y-4">
          {/* Storefront Link */}
          <Link 
            href="/dashboard/storefront" 
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Store className="mr-3 flex-shrink-0 h-5 w-5" />
            Customize Storefront
          </Link>
          
          {/* Account Info */}
          <div className="flex items-center px-3">
            <User className="h-5 w-5 text-muted-foreground mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium">Seller Account</p>
              <p className="text-xs text-muted-foreground">Sign out →</p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </div>
  );
}
