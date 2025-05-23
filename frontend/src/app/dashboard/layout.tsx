'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Products', href: '/dashboard/products' },
    { name: 'Orders', href: '/dashboard/orders' },
    { name: 'Customers', href: '/dashboard/customers' },
    { name: 'Settings', href: '/dashboard/settings' },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile menu */}
            <div className="lg:hidden">
                <div className="flex items-center justify-between p-4 bg-white border-b">
                    <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                        CC Dashboard
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                </div>
                <div className="overflow-x-auto">
                    <div className="flex space-x-4 p-4">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${pathname === item.href
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
                    <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                        <div className="flex flex-shrink-0 items-center px-4">
                            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                                CC Dashboard
                            </Link>
                        </div>
                        <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${pathname === item.href
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64 flex flex-col flex-1">
                <main className="flex-1">
                    <div className="py-6">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}