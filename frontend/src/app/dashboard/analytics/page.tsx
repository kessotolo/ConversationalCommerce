'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <DashboardHeader 
            title="Analytics" 
            subtitle="Track your store performance"
          />
          
          {/* Date Range Selector */}
          <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-muted/20 p-1 rounded-md">
            <button 
              onClick={() => setDateRange('7days')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === '7days' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              7 Days
            </button>
            <button 
              onClick={() => setDateRange('30days')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === '30days' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              30 Days
            </button>
            <button 
              onClick={() => setDateRange('90days')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === '90days' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              90 Days
            </button>
            <button 
              onClick={() => setDateRange('custom')}
              className={`px-3 py-1 text-sm rounded-md ${dateRange === 'custom' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              Custom
            </button>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold">₦45,670</h3>
                <p className="text-xs flex items-center text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12.5% from last period
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <h3 className="text-2xl font-bold">256</h3>
                <p className="text-xs flex items-center text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8.3% from last period
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <ShoppingBag className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Customers</p>
                <h3 className="text-2xl font-bold">87</h3>
                <p className="text-xs flex items-center text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +15.2% from last period
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <h3 className="text-2xl font-bold">5.4%</h3>
                <p className="text-xs flex items-center text-red-600">
                  <ArrowUpRight className="h-3 w-3 mr-1 transform rotate-90" />
                  -2.1% from last period
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
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
          <Card>
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
          <Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Customer Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Pie data={mockCustomerAcquisition} options={pieOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
