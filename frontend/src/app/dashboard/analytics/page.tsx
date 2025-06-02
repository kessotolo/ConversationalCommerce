'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  ArrowUpRight,
  DollarSign,
  Users,
  User,
  Download,
  Eye,
  RefreshCcw,
  Package,
  Truck,
  MessageSquare,
} from 'lucide-react';
import { Line, Pie, Bar } from 'react-chartjs-2';
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
import { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';

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

// Mock data for analytics
const mockSalesData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Revenue',
      data: [4500, 6000, 5300, 7800, 8900, 7400],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      fill: true,
    },
  ],
};

const mockChannelData = {
  labels: ['WhatsApp', 'Web', 'In-Store'],
  datasets: [
    {
      label: 'Sales by Channel',
      data: [65, 25, 10],
      backgroundColor: [
        'rgba(37, 99, 235, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
      ],
      borderWidth: 1,
    },
  ],
};

const mockProductPerformance = {
  labels: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
  datasets: [
    {
      label: 'Units Sold',
      data: [42, 35, 28, 24, 18],
      backgroundColor: 'rgba(37, 99, 235, 0.8)',
    },
  ],
};

const mockCustomerAcquisition = {
  labels: ['Direct', 'WhatsApp', 'Social', 'Referral', 'Search'],
  datasets: [
    {
      label: 'New Customers',
      data: [28, 35, 12, 18, 7],
      backgroundColor: [
        'rgba(37, 99, 235, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(220, 38, 38, 0.8)',
        'rgba(139, 92, 246, 0.8)',
      ],
    },
  ],
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days');
  const [hasData] = useState(true); // Set to false to test empty state

  // Conversation analytics state
  const [convAnalytics, setConvAnalytics] = useState<any>(null);
  const [loadingConv, setLoadingConv] = useState(false);

  // Real-time event and alert feed
  const [eventFeed, setEventFeed] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Fetch conversation analytics from backend
    const fetchAnalytics = async () => {
      setLoadingConv(true);
      try {
        const res = await fetch('/api/conversation-analytics');
        if (!res.ok) throw new Error('Failed to fetch conversation analytics');
        const data = await res.json();
        setConvAnalytics(data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch conversation analytics', err);
      } finally {
        setLoadingConv(false);
      }
    };
    fetchAnalytics();
  }, []);

  useEffect(() => {
    // Connect to WebSocket for real-time events/alerts
    const ws = new WebSocket(
      typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws/monitoring?tenant_id=demo`
        : '',
    );
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'conversation_event' || data.type === 'alert') {
          setEventFeed((prev) => [data, ...prev.slice(0, 49)]); // Keep last 50
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('WebSocket message parse error', err);
      }
    };
    ws.onerror = (err) => {
      // eslint-disable-next-line no-console
      console.warn('WebSocket error', err);
    };
    return () => {
      ws.close();
    };
  }, []);

  // Prepare chart data for events by type
  const eventTypeChart = convAnalytics && {
    labels: Object.keys(convAnalytics.counts_by_type || {}),
    datasets: [
      {
        label: 'Events',
        data: Object.values(convAnalytics.counts_by_type || {}),
        backgroundColor: [
          '#2563eb',
          '#16b981',
          '#f59e0b',
          '#dc2626',
          '#8b5cf6',
          '#f43f5e',
          '#0ea5e9',
          '#fbbf24',
        ],
      },
    ],
  };

  // Prepare chart data for events by day
  const eventDayChart = convAnalytics && {
    labels: (convAnalytics.counts_by_day || []).map((d: any) => d.date),
    datasets: [
      {
        label: 'Events per Day',
        data: (convAnalytics.counts_by_day || []).map((d: any) => d.count),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  // Function to export report as CSV
  const exportReport = () => {
    alert('Report would be exported as CSV in production version');
    // In production, this would generate and download a CSV file
  };

  return (
    <div className="space-y-8">
      {/* Real-time Event & Alert Feed */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Live Conversation Events & Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto text-sm">
              {eventFeed.length === 0 ? (
                <div className="text-gray-400">No recent events or alerts</div>
              ) : (
                <ul>
                  {eventFeed.map((e, i) => (
                    <li key={i} className="mb-2">
                      {e.type === 'conversation_event' ? (
                        <span>
                          <b>Event:</b> <span className="text-blue-700">{e.event.event_type}</span>{' '}
                          &mdash; <span className="text-gray-500">{e.event.created_at}</span>
                          {e.event.payload?.content && (
                            <span>
                              {' '}
                              — <span className="italic">{e.event.payload.content}</span>
                            </span>
                          )}
                        </span>
                      ) : e.type === 'alert' ? (
                        <span>
                          <b className="text-red-700">ALERT:</b>{' '}
                          <span className="font-semibold">{e.alert_type}</span> &mdash; {e.message}
                          <span className="text-gray-500"> ({e.severity})</span>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Conversation Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Conversation Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingConv ? '...' : (convAnalytics?.total_count ?? '--')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Events by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {eventTypeChart ? (
              <Pie
                data={eventTypeChart}
                options={{ responsive: true, maintainAspectRatio: false }}
                height={120}
              />
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Events by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {eventDayChart ? (
              <Line
                data={eventDayChart}
                options={{ responsive: true, maintainAspectRatio: false }}
                height={120}
              />
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Response Time (s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingConv
                ? '...'
                : convAnalytics?.avg_response_time_seconds !== null &&
                    convAnalytics?.avg_response_time_seconds !== undefined
                  ? convAnalytics.avg_response_time_seconds.toFixed(2)
                  : '--'}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics</h1>
          <p className="text-gray-500 text-sm">Track your store performance</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="flex items-center space-x-2 bg-[#f7faf9] p-1 rounded-md">
            <button
              onClick={() => setDateRange('7days')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === '7days' ? 'bg-[#6C9A8B] text-white' : 'hover:bg-[#e8f6f1]'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30days')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === '30days' ? 'bg-[#6C9A8B] text-white' : 'hover:bg-[#e8f6f1]'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateRange('90days')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === '90days' ? 'bg-[#6C9A8B] text-white' : 'hover:bg-[#e8f6f1]'}`}
            >
              90 Days
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === 'custom' ? 'bg-[#6C9A8B] text-white' : 'hover:bg-[#e8f6f1]'}`}
            >
              Custom
            </button>
          </div>
          <Button onClick={exportReport} className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      {/* Empty State */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-24">
          <img src="/empty-box.svg" alt="No analytics data" className="w-32 h-32 mb-6 opacity-80" />
          <h2 className="text-xl font-semibold mb-2">No analytics data yet</h2>
          <p className="text-gray-500 mb-6">
            Analytics will appear here as your store gets orders and customers.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/orders"
              className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start hover:shadow-md transition cursor-pointer"
            >
              <StatCard
                title="Total Orders"
                value="85"
                icon={<ShoppingBag className="h-5 w-5 text-[#6C9A8B]" />}
                change={12}
                trend="up"
                subtitle="Last 30 days"
              />
            </Link>
            <Link
              href="/dashboard/analytics?tab=finance"
              className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start hover:shadow-md transition cursor-pointer"
            >
              <StatCard
                title="Total Revenue"
                value="₦6,674.55"
                icon={<DollarSign className="h-5 w-5 text-[#6C9A8B]" />}
                change={8}
                trend="up"
                subtitle="Last 30 days"
              />
            </Link>
            <Link
              href="/dashboard/customers"
              className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start hover:shadow-md transition cursor-pointer"
            >
              <StatCard
                title="Customers"
                value="63"
                icon={<Users className="h-5 w-5 text-[#6C9A8B]" />}
                change={5}
                trend="up"
                subtitle="Last 30 days"
              />
            </Link>
            <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
              <StatCard
                title="Conversion Rate"
                value="54%"
                icon={<ArrowUpRight className="h-5 w-5 text-[#6C9A8B]" />}
                change={-2}
                trend="down"
                subtitle="Last 30 days"
              />
            </div>
          </div>
          {/* Sales Trend Chart */}
          <Card className="rounded-2xl border border-[#e6f0eb] shadow-sm">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Sales Trend</span>
                <Button onClick={exportReport} className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line data={mockSalesData} options={lineOptions} />
              </div>
            </CardContent>
          </Card>
          {/* Two-column layout for analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Performance */}
            <Card className="rounded-2xl border border-[#e6f0eb] shadow-sm">
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Pie data={mockChannelData} options={pieOptions} />
                </div>
              </CardContent>
            </Card>
            {/* Product Performance */}
            <Card className="rounded-2xl border border-[#e6f0eb] shadow-sm">
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={mockProductPerformance} options={barOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Customer Acquisition */}
          <Card className="rounded-2xl border border-[#e6f0eb] shadow-sm">
            <CardHeader>
              <CardTitle>Customer Acquisition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Pie data={mockCustomerAcquisition} options={pieOptions} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
