'use client';

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
import { ShoppingBag, ArrowUpRight, DollarSign, Users, Download } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';

import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/Button';
import { CardContent, CardHeader, CardTitle, Card } from '@/components/ui/Card';
import { useTenant } from '@/contexts/TenantContext';

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

interface EventCountByDay {
  date: string;
  count: number;
}

interface ConversationAnalytics {
  counts_by_type: Record<string, number>;
  counts_by_day: EventCountByDay[];
  total_count: number;
  avg_response_time_seconds: number;
}

interface QualityLeaderboardRow {
  conversation_id: string;
  quality_score: number;
  avg_response_time_seconds: number;
  avg_sentiment: number;
  resolved: boolean;
}

function isConversationAnalytics(obj: unknown): obj is ConversationAnalytics {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'counts_by_type' in obj &&
    'counts_by_day' in obj &&
    'total_count' in obj &&
    'avg_response_time_seconds' in obj
  );
}

function isQualityLeaderboardRow(obj: unknown): obj is QualityLeaderboardRow {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'conversation_id' in obj &&
    'quality_score' in obj &&
    'avg_response_time_seconds' in obj &&
    'avg_sentiment' in obj &&
    'resolved' in obj
  );
}

export default function AnalyticsPage() {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days');
  const [hasData, setHasData] = useState(true); // Will be set based on real data

  // Conversation analytics state
  const [convAnalytics, setConvAnalytics] = useState<ConversationAnalytics | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);

  // Real-time event and alert feed
  const [eventFeed, setEventFeed] = useState<unknown[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Conversation quality leaderboard
  const [qualityLeaderboard, setQualityLeaderboard] = useState<QualityLeaderboardRow[]>([]);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    // Fetch conversation analytics from backend
    const fetchAnalytics = async () => {
      setLoadingConv(true);
      setConvError(null);
      try {
        const res = await fetch(`/api/conversation-analytics?tenant_id=${tenant.id}`);
        if (!res.ok) throw new Error('Failed to fetch conversation analytics');
        const data = await res.json();
        setConvAnalytics(data);
        setHasData(!!data && data.total_count > 0);
      } catch (err) {
        setConvError('Failed to fetch conversation analytics');
        setHasData(false);
      } finally {
        setLoadingConv(false);
      }
    };
    fetchAnalytics();
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    // Connect to WebSocket for real-time events/alerts
    const ws = new WebSocket(
      typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws/monitoring/${tenant.id}`
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
        // Ignore parse errors
      }
    };
    ws.onerror = () => { };
    return () => {
      ws.close();
    };
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    // Fetch conversation quality scores
    const fetchQuality = async () => {
      setLoadingQuality(true);
      setQualityError(null);
      try {
        const res = await fetch(`/api/conversation-quality?tenant_id=${tenant.id}`);
        if (!res.ok) throw new Error('Failed to fetch conversation quality');
        const data = await res.json();
        setQualityLeaderboard(data as QualityLeaderboardRow[]);
      } catch (err) {
        setQualityError('Failed to fetch conversation quality');
      } finally {
        setLoadingQuality(false);
      }
    };
    fetchQuality();
  }, [tenant]);

  // Prepare chart data for events by type
  const eventTypeChart = convAnalytics
    ? {
      labels: Object.keys(convAnalytics.counts_by_type) as string[],
      datasets: [
        {
          label: 'Events',
          data: Object.values(convAnalytics.counts_by_type) as number[],
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
    }
    : undefined;

  // Prepare chart data for events by day
  const eventDayChart = convAnalytics
    ? {
      labels: (convAnalytics.counts_by_day as EventCountByDay[]).map((d: EventCountByDay) => d.date) as string[],
      datasets: [
        {
          label: 'Events per Day',
          data: (convAnalytics.counts_by_day as EventCountByDay[]).map((d: EventCountByDay) => d.count) as number[],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
        },
      ],
    }
    : undefined;

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

  // Export CSV handlers
  const handleExportAnalytics = () => {
    window.open('/api/conversation-analytics/export', '_blank');
  };
  const handleExportQuality = () => {
    window.open('/api/conversation-quality/export', '_blank');
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
                  {eventFeed.map((e, i) => {
                    if (typeof e === 'object' && e !== null && 'type' in e) {
                      if (
                        e.type === 'conversation_event' &&
                        'event' in e &&
                        typeof e.event === 'object' &&
                        e.event !== null &&
                        'event_type' in e.event &&
                        'created_at' in e.event
                      ) {
                        return (
                          <li key={i} className="mb-2">
                            <span>
                              <b>Event:</b>{' '}
                              <span className="text-blue-700">{e.event.event_type as string}</span>{' '}
                              &mdash;{' '}
                              <span className="text-gray-500">{e.event.created_at as string}</span>
                              {'payload' in e.event &&
                                e.event.payload &&
                                typeof e.event.payload === 'object' &&
                                'content' in e.event.payload ? (
                                <span>
                                  {' '}
                                  —{' '}
                                  <span className="italic">
                                    {(e.event.payload as { content?: string }).content}
                                  </span>
                                </span>
                              ) : null}
                            </span>
                          </li>
                        );
                      } else if (
                        e.type === 'alert' &&
                        'alert_type' in e &&
                        'message' in e &&
                        'severity' in e
                      ) {
                        return (
                          <li key={i} className="mb-2">
                            <span>
                              <b className="text-red-700">ALERT:</b>{' '}
                              <span className="font-semibold">{e.alert_type as string}</span>{' '}
                              &mdash; {e.message as string}
                              <span className="text-gray-500"> ({e.severity as string})</span>
                            </span>
                          </li>
                        );
                      }
                    }
                    return null;
                  })}
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
            <Button variant="outline" size="sm" onClick={handleExportAnalytics} className="ml-auto">
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingConv
                ? '...'
                : isConversationAnalytics(convAnalytics)
                  ? convAnalytics.total_count
                  : '--'}
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
                : isConversationAnalytics(convAnalytics) &&
                  convAnalytics.avg_response_time_seconds !== null &&
                  convAnalytics.avg_response_time_seconds !== undefined
                  ? convAnalytics.avg_response_time_seconds.toFixed(2)
                  : '--'}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Conversation Quality Leaderboard */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversation Quality Leaderboard</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportQuality} className="ml-auto">
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2">Conversation ID</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">Avg. Response (s)</th>
                    <th className="text-left p-2">Avg. Sentiment</th>
                    <th className="text-left p-2">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingQuality ? (
                    <tr>
                      <td colSpan={5} className="p-2 text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : qualityLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-2 text-gray-400">
                        No data
                      </td>
                    </tr>
                  ) : (
                    qualityLeaderboard.map((row, i) => {
                      if (!isQualityLeaderboardRow(row)) return null;
                      return (
                        <tr key={row.conversation_id} className={i < 3 ? 'bg-green-50' : ''}>
                          <td className="p-2 font-mono">{row.conversation_id}</td>
                          <td className="p-2 font-bold">{row.quality_score}</td>
                          <td className="p-2">
                            {row.avg_response_time_seconds !== null &&
                              row.avg_response_time_seconds !== undefined
                              ? row.avg_response_time_seconds.toFixed(1)
                              : '--'}
                          </td>
                          <td className="p-2">
                            {row.avg_sentiment !== null && row.avg_sentiment !== undefined
                              ? row.avg_sentiment.toFixed(2)
                              : '--'}
                          </td>
                          <td className="p-2">{row.resolved ? '✅' : '❌'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
                {eventDayChart ? (
                  <Line data={eventDayChart} options={lineOptions} />
                ) : loadingConv ? (
                  <div className="text-gray-400">Loading...</div>
                ) : (
                  <div className="text-gray-400">No data</div>
                )}
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
                  {eventTypeChart ? (
                    <Pie data={eventTypeChart} options={pieOptions} />
                  ) : loadingConv ? (
                    <div className="text-gray-400">Loading...</div>
                  ) : (
                    <div className="text-gray-400">No data</div>
                  )}
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
                  <div className="text-gray-400">No data</div>
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
                <div className="text-gray-400">No data</div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
