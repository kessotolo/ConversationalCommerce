'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

export default function DashboardPage() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        setToken(storedToken);
    }, []);

    return (
        <>
            <SignedIn>
                <div className="p-4">
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>

                    {/* Stats Grid */}
                    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Revenue
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900">
                                            $12,345
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">🛍️</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Orders
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900">
                                            123
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Customers
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900">
                                            456
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">📦</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Products
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900">
                                            789
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <div className="mt-8">
                        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
                            <ul className="divide-y divide-gray-200">
                                {recentActivity.map((activity, index) => (
                                    <li key={index}>
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-blue-600 truncate">
                                                    {activity.title}
                                                </p>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        {activity.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        {activity.description}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p>
                                                        {activity.time}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    )
}

const recentActivity = [
    {
        title: 'New Order #1234',
        description: 'John Doe purchased 2 items',
        status: 'Completed',
        time: '2 hours ago'
    },
    {
        title: 'New Customer Registration',
        description: 'Jane Smith created an account',
        status: 'New',
        time: '4 hours ago'
    },
    {
        title: 'Product Update',
        description: 'Updated pricing for Product X',
        status: 'Updated',
        time: '1 day ago'
    }
];