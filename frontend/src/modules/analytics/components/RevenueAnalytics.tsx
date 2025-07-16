'use client';

import React, { useState, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, CalendarDays, Download, Filter } from 'lucide-react';
import type { AnalyticsMetrics, AnalyticsFilters } from './AnalyticsOrchestrator';

/**
 * Business Context:
 * - "Merchant" = Business customer using the platform to run their online store
 * - Revenue analytics help merchants understand income trends, seasonal patterns, and growth opportunities
 * - Multi-channel revenue tracking (website, social media, direct sales)
 * - Time-based analysis for business planning and forecasting
 */

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
);

interface RevenueAnalyticsProps {
    metrics: AnalyticsMetrics | null;
    filters: AnalyticsFilters;
    onFilterChange?: (filters: Partial<AnalyticsFilters>) => void;
    onExport?: (format: 'csv' | 'pdf' | 'excel') => void;
    isCompactView?: boolean;
    className?: string;
}

type RevenueMetric = 'total' | 'average' | 'growth' | 'forecast';
type RevenueView = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/**
 * Revenue Analytics Component
 *
 * Comprehensive revenue analysis dashboard providing merchants with:
 * - Revenue trends and growth analysis
 * - Channel performance comparison
 * - Forecasting and predictions
 * - Time-based breakdowns (daily, weekly, monthly)
 * - Export capabilities for business reporting
 *
 * Features:
 * - Interactive charts with drill-down capabilities
 * - Multiple visualization types (line, bar, doughnut)
 * - Revenue forecasting based on historical data
 * - Channel attribution analysis
 * - Mobile-optimized responsive design
 * - Real-time data updates
 */
export default function RevenueAnalytics({
    metrics,
    filters,
    onFilterChange,
    onExport,
    isCompactView = false,
    className = ''
}: RevenueAnalyticsProps) {
    const [selectedMetric, setSelectedMetric] = useState<RevenueMetric>('total');
    const [selectedView, setSelectedView] = useState<RevenueView>('daily');
    const [showForecast, setShowForecast] = useState(false);

    // Calculate revenue insights and forecasts
    const revenueInsights = useMemo(() => {
        if (!metrics?.revenueByDay?.length) {
            return {
                totalRevenue: 0,
                averageDaily: 0,
                growthRate: 0,
                trending: 'stable' as 'up' | 'down' | 'stable',
                forecast: [],
                channelBreakdown: [],
                topGrowthDays: []
            };
        }

        const revenueData = metrics.revenueByDay;
        const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
        const averageDaily = totalRevenue / revenueData.length;

        // Calculate growth rate (compare first half vs second half)
        const midPoint = Math.floor(revenueData.length / 2);
        const firstHalf = revenueData.slice(0, midPoint);
        const secondHalf = revenueData.slice(midPoint);

        const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.revenue, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.revenue, 0) / secondHalf.length;
        const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

        const trending = growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable';

        // Simple forecast (next 7 days based on recent trend)
        const recentData = revenueData.slice(-7);
        const recentAvg = recentData.reduce((sum, day) => sum + day.revenue, 0) / recentData.length;
        const trendSlope = recentData.length > 1 && recentData[recentData.length - 1] && recentData[0] ?
            (recentData[recentData.length - 1]!.revenue - recentData[0]!.revenue) / (recentData.length - 1) : 0;

        const forecast = Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            revenue: Math.max(0, recentAvg + (trendSlope * (i + 1))),
            orders: Math.ceil((recentAvg + (trendSlope * (i + 1))) / (metrics?.averageOrderValue || 1))
        }));

        // Channel breakdown (if available)
        const channelBreakdown = metrics?.channelPerformance || [];

        // Top growth days
        const topGrowthDays = revenueData
            .map((day, index) => ({
                ...day,
                growth: index > 0 && revenueData[index - 1] ? ((day.revenue - revenueData[index - 1]!.revenue) / revenueData[index - 1]!.revenue) * 100 : 0
            }))
            .filter(day => day.growth > 0)
            .sort((a, b) => b.growth - a.growth)
            .slice(0, 5);

        return {
            totalRevenue,
            averageDaily,
            growthRate,
            trending,
            forecast,
            channelBreakdown,
            topGrowthDays
        };
    }, [metrics]);

    // Prepare chart data based on selected view
    const chartData = useMemo(() => {
        if (!metrics?.revenueByDay?.length) {
            return {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                }]
            };
        }

        const data = metrics.revenueByDay;
        let processedData = data;

        // Group data based on selected view
        if (selectedView === 'weekly') {
            // Group by weeks
            processedData = groupByPeriod(data, 7);
        } else if (selectedView === 'monthly') {
            // Group by months
            processedData = groupByMonth(data);
        }

        const labels = processedData.map(item => {
            const date = new Date(item.date);
            if (selectedView === 'monthly') {
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            } else if (selectedView === 'weekly') {
                return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const revenueDataset = {
            label: 'Revenue',
            data: processedData.map(item => item.revenue),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
        };

        const ordersDataset = {
            label: 'Orders',
            data: processedData.map(item => item.orders),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: false,
            yAxisID: 'y1',
        };

        // Include forecast if enabled
        if (showForecast && revenueInsights.forecast.length > 0) {
            const forecastLabels = revenueInsights.forecast.map(item => {
                const date = new Date(item.date || new Date());
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });

            const forecastDataset = {
                label: 'Forecast',
                data: [...Array(processedData.length).fill(null), ...revenueInsights.forecast.map(item => item.revenue)],
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderDash: [5, 5],
                fill: false,
            };

            return {
                labels: [...labels, ...forecastLabels],
                datasets: [revenueDataset, ordersDataset, forecastDataset],
            };
        }

        return {
            labels,
            datasets: [revenueDataset, ordersDataset],
        };
    }, [metrics, selectedView, showForecast, revenueInsights.forecast]);

    // Helper function to group data by period
    function groupByPeriod(data: Array<{ date: string; revenue: number; orders: number }>, days: number) {
        const grouped: Array<{ date: string; revenue: number; orders: number }> = [];
        for (let i = 0; i < data.length; i += days) {
            const chunk = data.slice(i, i + days);
            if (chunk.length > 0 && chunk[0]) {
                const totalRevenue = chunk.reduce((sum, item) => sum + item.revenue, 0);
                const totalOrders = chunk.reduce((sum, item) => sum + item.orders, 0);
                grouped.push({
                    date: chunk[0].date,
                    revenue: totalRevenue,
                    orders: totalOrders,
                });
            }
        }
        return grouped;
    }

    // Helper function to group data by month
    function groupByMonth(data: Array<{ date: string; revenue: number; orders: number }>) {
        const monthlyData = new Map();

        data.forEach(item => {
            const date = new Date(item.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
                    revenue: 0,
                    orders: 0,
                });
            }

            const monthData = monthlyData.get(monthKey);
            monthData.revenue += item.revenue;
            monthData.orders += item.orders;
        });

        return Array.from(monthlyData.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Channel performance chart data
    const channelChartData = useMemo(() => {
        if (!revenueInsights.channelBreakdown?.length) {
            return {
                labels: ['No data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e5e7eb'],
                }]
            };
        }

        return {
            labels: revenueInsights.channelBreakdown.map(channel => channel.channel),
            datasets: [{
                data: revenueInsights.channelBreakdown.map(channel => channel.revenue),
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#06b6d4',
                ],
            }]
        };
    }, [revenueInsights.channelBreakdown]);

    // Chart options
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        if (label === 'Revenue') {
                            return `${label}: $${value.toLocaleString()}`;
                        }
                        return `${label}: ${value}`;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Date'
                }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: {
                    display: true,
                    text: 'Revenue ($)'
                },
                ticks: {
                    callback: function (value: any) {
                        return '$' + value.toLocaleString();
                    }
                }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: {
                    display: true,
                    text: 'Orders'
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            }
        },
    };

    if (isCompactView) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Key metrics */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-xl font-bold">${revenueInsights.totalRevenue.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Daily Average</p>
                                <p className="text-xl font-bold">${revenueInsights.averageDaily.toFixed(0)}</p>
                            </div>
                        </div>

                        {/* Growth indicator */}
                        <div className="flex items-center gap-2">
                            {revenueInsights.trending === 'up' ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : revenueInsights.trending === 'down' ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                                <span className="h-4 w-4 bg-gray-400 rounded-full" />
                            )}
                            <span className={`text-sm ${revenueInsights.trending === 'up' ? 'text-green-600' :
                                revenueInsights.trending === 'down' ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                {revenueInsights.growthRate > 0 ? '+' : ''}{revenueInsights.growthRate.toFixed(1)}% growth
                            </span>
                        </div>

                        {/* Mini chart */}
                        <div className="h-32">
                            <Line data={chartData} options={{
                                ...lineChartOptions,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { display: false },
                                    y: { display: false },
                                    y1: { display: false },
                                }
                            }} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Revenue Analytics</h2>
                    <p className="text-muted-foreground">Track revenue trends and growth patterns</p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={selectedView} onValueChange={(value) => setSelectedView(value as RevenueView)}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowForecast(!showForecast)}
                        className={showForecast ? 'bg-blue-50 border-blue-200' : ''}
                    >
                        Forecast
                    </Button>

                    {onExport && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onExport('csv')}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    )}
                </div>
            </div>

            {/* Key metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-2xl font-bold">${revenueInsights.totalRevenue.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Daily Average</p>
                                <p className="text-2xl font-bold">${revenueInsights.averageDaily.toFixed(0)}</p>
                            </div>
                            <CalendarDays className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Growth Rate</p>
                                <p className="text-2xl font-bold">{revenueInsights.growthRate.toFixed(1)}%</p>
                            </div>
                            {revenueInsights.trending === 'up' ? (
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            ) : revenueInsights.trending === 'down' ? (
                                <TrendingDown className="h-8 w-8 text-red-500" />
                            ) : (
                                <div className="h-8 w-8 bg-gray-400 rounded-full" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                                <p className="text-2xl font-bold">${metrics?.averageOrderValue?.toFixed(2) || '0.00'}</p>
                            </div>
                            <span className="text-2xl">🛒</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main revenue chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80">
                        <Line data={chartData} options={lineChartOptions} />
                    </div>
                </CardContent>
            </Card>

            {/* Channel performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Channel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <Doughnut data={channelChartData} options={doughnutOptions} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Growth Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {revenueInsights.topGrowthDays.length > 0 ? (
                                revenueInsights.topGrowthDays.map((day, index) => (
                                    <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                                            <p className="text-sm text-muted-foreground">${day.revenue.toLocaleString()}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-green-600">
                                            +{day.growth.toFixed(1)}%
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No growth data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}