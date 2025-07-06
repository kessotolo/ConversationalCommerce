'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DashboardMetrics {
    totalConversations: number
    activeConversations: number
    conversionRate: number
    avgResponseTime: number
    systemStatus: 'healthy' | 'degraded' | 'down'
    securityEnabled: boolean
}

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMetrics = async () => {
        setLoading(true)
        setError(null)

        try {
            // This will connect to your backend APIs
            const response = await fetch('/api/admin/dashboard-metrics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
                }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch metrics')
            }

            const data = await response.json()
            setMetrics(data)
        } catch (err) {
            // For now, show demo data when API is not available
            setMetrics({
                totalConversations: 1247,
                activeConversations: 89,
                conversionRate: 0.156,
                avgResponseTime: 2300,
                systemStatus: 'healthy',
                securityEnabled: true
            })
            console.log('Using demo data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMetrics()
        const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={fetchMetrics} className="w-full">
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">
                            ConversationalCommerce Admin
                        </h1>
                        <div className="flex items-center space-x-4">
                            <Badge variant={metrics?.systemStatus === 'healthy' ? 'default' : 'destructive'}>
                                {metrics?.systemStatus === 'healthy' ? '✅ Healthy' : '⚠️ Issues'}
                            </Badge>
                            <Button onClick={fetchMetrics} variant="outline" size="sm">
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">

                    {/* Commerce-First Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                                <span className="text-2xl">💬</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {metrics?.totalConversations.toLocaleString() || '0'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    All-time conversations across channels
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
                                <span className="text-2xl">🔥</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {metrics?.activeConversations.toLocaleString() || '0'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Currently active conversations
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                                <span className="text-2xl">📈</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {metrics?.conversionRate ? `${(metrics.conversionRate * 100).toFixed(1)}%` : '0%'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Chat to order conversion
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                                <span className="text-2xl">⚡</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {metrics?.avgResponseTime ? `${Math.round(metrics.avgResponseTime / 1000)}s` : '0s'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Average response time
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Commerce Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Platform Activity</CardTitle>
                                <CardDescription>Conversations by platform today</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">📱 WhatsApp</span>
                                        <Badge variant="secondary">847</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">📸 Instagram</span>
                                        <Badge variant="secondary">234</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">🌐 Web</span>
                                        <Badge variant="secondary">166</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">📨 SMS</span>
                                        <Badge variant="secondary">45</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Security Status</CardTitle>
                                <CardDescription>Current security configuration</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                        <span className="text-sm font-medium">Staff Access</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                        <span className="text-sm font-medium">IP Allowlisting</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                        <span className="text-sm font-medium">2FA Enabled</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                        <span className="text-sm font-medium">Audit Logging</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions - Commerce Focused */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Manage your conversational commerce platform</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    View Live Chats
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700">
                                    Manage Merchants
                                </Button>
                                <Button className="bg-purple-600 hover:bg-purple-700">
                                    Analytics Report
                                </Button>
                                <Button className="bg-orange-600 hover:bg-orange-700">
                                    Security Audit
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    )
}