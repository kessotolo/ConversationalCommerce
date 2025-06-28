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
import { Line } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import { ShoppingBag, ArrowUpRight, DollarSign, Users } from 'lucide-react';

import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/dashboard/StatCard';

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

function isConversationAnalytics(obj: unknown): obj is ConversationAnalytics {
  if (!obj || typeof obj !== 'object') return false;

  // Check for required properties
  return (
    'counts_by_type' in obj &&
    'counts_by_day' in obj &&
    'total_count' in obj &&
    'avg_response_time_seconds' in obj
  );
}

export default function AnalyticsPage() {
  const { tenant } = useTenant();
  const [convAnalytics, setConvAnalytics] = useState<ConversationAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenant) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversation-analytics?tenant_id=${tenant.id}`);
        if (!res.ok) throw new Error('Failed to fetch conversation analytics');
        const data = await res.json();
        if (isConversationAnalytics(data)) {
          setConvAnalytics(data);
        }
      } catch (err) {
        console.error('Failed to fetch conversation analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [tenant]);

  // Prepare chart data for events by day
  const eventDayChart = convAnalytics
    ? {
      labels: convAnalytics.counts_by_day.map((day) => day.date),
      datasets: [
        {
          label: 'Conversations',
          data: convAnalytics.counts_by_day.map((day) => day.count),
          fill: 'start',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          tension: 0.4,
        },
      ],
    }
    : {
      labels: [],
      datasets: [
        {
          label: 'Conversations',
          data: [],
          fill: 'start',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          tension: 0.4,
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

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Conversations"
          value={convAnalytics?.total_count.toString() || '0'}
          icon={<ShoppingBag className="h-8 w-8 text-blue-500" />}
          change={12.5}
          trend="up"
        />
        <StatCard
          title="Avg. Response Time"
          value={convAnalytics ? `${Math.round(convAnalytics.avg_response_time_seconds)}s` : '0s'}
          icon={<DollarSign className="h-8 w-8 text-green-500" />}
          change={-3.2}
          trend="down"
        />
        <StatCard
          title="Active Customers"
          value={convAnalytics?.counts_by_type?.['active_customers']?.toString() || '0'}
          icon={<Users className="h-8 w-8 text-purple-500" />}
          change={0}
          trend="up"
        />
        <StatCard
          title="Conversion Rate"
          value={convAnalytics?.counts_by_type?.['conversion_rate']?.toString() || '0%'}
          icon={<ArrowUpRight className="h-8 w-8 text-red-500" />}
          change={0}
          trend="up"
        />
      </div>

      {/* Conversations Over Time Chart */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle>Conversation Trends</CardTitle>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => alert('Export feature coming soon')}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            ) : (
              <Line data={eventDayChart} options={lineOptions} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Section */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle>More Analytics Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Advanced analytics features will be available in the next version. This includes conversation quality metrics,
            sentiment analysis, and detailed customer engagement reports.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
