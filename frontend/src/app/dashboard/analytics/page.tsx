import * as React from 'react';
'use client';
import { ArrowUpRight, Calendar, DollarSign, Download, Search, ShoppingBag, Store, Users } from 'lucide-react';
// Removed circular import;

// Removed self-import
// Removed self-import
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Removed self-import
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingBag,
  Calendar,
  Download,
  PieChart,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';
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
import { Line, Bar, Pie } from 'react-chartjs-2';
import Link from 'next/link';
// Removed self-import

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
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
    <DashboardLayout>
      <div className="space-y-8">
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
            <Button onClick={exportReport} variant="outline" size="sm" className="flex items-center">
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
            <p className="text-gray-500 mb-6">Analytics will appear here as your store gets orders and customers.</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/orders" className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start hover:shadow-md transition cursor-pointer">
                <StatCard
                  title="Total Orders"
                  value="85"
                  icon={<ShoppingBag className="h-5 w-5 text-[#6C9A8B]" />}
                  change={12}
                  trend="up"
                  subtitle="Last 30 days"
                />
              </Link>
              <Link href="/dashboard/analytics?tab=finance" className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start hover:shadow-md transition cursor-pointer">
                <StatCard
                  title="Total Revenue"
                  value="₦6,674.55"
                  icon={<DollarSign className="h-5 w-5 text-[#6C9A8B]" />}
                  change={8}
                  trend="up"
                  subtitle="Last 30 days"
                />
              </Link>
              <Link href="/dashboard/customers" className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start hover:shadow-md transition cursor-pointer">
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
                  <Button onClick={exportReport} variant="outline" size="sm" className="flex items-center">
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
    </DashboardLayout>
  );
}
