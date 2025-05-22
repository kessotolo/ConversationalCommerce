'use client';

import { useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import { useUser } from '@clerk/nextjs';

interface HealthStatus {
    status: 'loading' | 'success' | 'error';
    message: string;
    data?: any;
}

export default function DashboardPage() {
    const { user } = useUser();
    const [healthStatus, setHealthStatus] = useState<HealthStatus>({
        status: 'loading',
        message: 'Checking API connection...',
    });

    useEffect(() => {
        const testHealth = async () => {
            try {
                const response = await apiClient.get('/health');
                setHealthStatus({
                    status: 'success',
                    message: 'API is healthy',
                    data: response.data,
                });
            } catch (error) {
                setHealthStatus({
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Failed to connect to API',
                });
            }
        };
        testHealth();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Welcome Section */}
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Welcome back, {user?.firstName || 'User'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Here's what's happening with your store today.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {/* API Health Card */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    {healthStatus.status === 'loading' && (
                                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                            <svg className="h-5 w-5 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        </div>
                                    )}
                                    {healthStatus.status === 'success' && (
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                    {healthStatus.status === 'error' && (
                                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            API Status
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <div className="text-lg font-semibold text-gray-900">
                                                {healthStatus.message}
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for future stats */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Sales
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <div className="text-lg font-semibold text-gray-900">
                                                Coming Soon
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for future stats */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Products
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <div className="text-lg font-semibold text-gray-900">
                                                Coming Soon
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}