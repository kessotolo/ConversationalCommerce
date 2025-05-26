import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Import icons
import { 
  Home, 
  Package, 
  ShoppingBag, 
  BarChart, 
  MessageCircle, 
  Settings,
  Menu,
  X
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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile menu button */}
      <button 
        onClick={toggleMenu} 
        className="md:hidden fixed bottom-4 right-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile navigation menu */}
      <div 
        className={cn(
          "fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out bg-background md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full pt-16 pb-20 overflow-y-auto">
          <div className="px-4 py-2">
            <h2 className="text-xl font-bold">Menu</h2>
          </div>
          <nav className="flex-1 px-4 pt-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;
                
                return (
                  <li key={item.name}>
                    <Link 
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center p-3 text-sm font-medium rounded-md",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom navigation bar - Mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t md:hidden">
        <nav className="flex items-center justify-around h-16">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-label={item.name}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
