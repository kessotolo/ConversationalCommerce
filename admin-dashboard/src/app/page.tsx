'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'

interface DashboardMetrics {
    totalConversations: number
    activeConversations: number
    conversionRate: number
    avgResponseTime: number
    systemStatus: 'healthy' | 'degraded' | 'down'
    securityEnabled: boolean
    platformActivity: {
        whatsapp: number
        instagram: number
        web: number
        sms: number
    }
    recentActivity: Array<{
        id: string
        type: 'conversation' | 'order' | 'alert'
        message: string
        timestamp: string
        status: 'success' | 'warning' | 'error'
    }>
}

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const fetchMetrics = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true)
        } else {
            setLoading(true)
        }
        setError(null)

        try {
            // Connect to backend admin API
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000'
            const response = await fetch(`${backendUrl}/api/admin/dashboard-metrics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
                    'Content-Type': 'application/json',
                }
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()
            setMetrics(data)
        } catch (err) {
            console.error('Error fetching admin metrics:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchMetrics()
        const interval = setInterval(() => fetchMetrics(true), 30000) // Refresh every 30 seconds
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Error Loading Dashboard
                        </CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => fetchMetrics()} className="w-full">
                            <RefreshCw className="h-4 w-4 mr-2" />
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
                            <Button
                                onClick={() => fetchMetrics(true)}
                                variant="outline"
                                size="sm"
                                disabled={refreshing}
                            >
                                {refreshing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                {refreshing ? 'Refreshing...' : 'Refresh'}
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
                                        <Badge variant="secondary">
                                            {metrics?.platformActivity?.whatsapp || 0}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">📸 Instagram</span>
                                        <Badge variant="secondary">
                                            {metrics?.platformActivity?.instagram || 0}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">🌐 Web</span>
                                        <Badge variant="secondary">
                                            {metrics?.platformActivity?.web || 0}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">📨 SMS</span>
                                        <Badge variant="secondary">
                                            {metrics?.platformActivity?.sms || 0}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Latest system events</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {metrics?.recentActivity?.length ? (
                                        metrics.recentActivity.map((activity) => (
                                            <div key={activity.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            activity.status === 'success' ? 'default' :
                                                                activity.status === 'warning' ? 'secondary' : 'destructive'
                                                        }
                                                        className="w-2 h-2 p-0 rounded-full"
                                                    />
                                                    <span className="text-sm">{activity.message}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No recent activity</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Security Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>System Security</CardTitle>
                            <CardDescription>Security and compliance status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Security Features</span>
                                <Badge variant={metrics?.securityEnabled ? 'default' : 'destructive'}>
                                    {metrics?.securityEnabled ? '🔒 Enabled' : '🔓 Disabled'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    )
}