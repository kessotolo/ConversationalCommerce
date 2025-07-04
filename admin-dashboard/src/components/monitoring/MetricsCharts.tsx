import React, { useState } from 'react';
import { MetricsSnapshot } from '../../services/monitoring';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface MetricsChartsProps {
  metrics: MetricsSnapshot;
}

type ChartType = 'cpu' | 'memory' | 'disk' | 'active_users' | 'requests_per_minute' | 'error_rate';

const MetricsCharts: React.FC<MetricsChartsProps> = ({ metrics }) => {
  const [selectedCharts, setSelectedCharts] = useState<ChartType[]>(['cpu', 'memory', 'active_users']);
  
  const toggleChart = (chartType: ChartType) => {
    if (selectedCharts.includes(chartType)) {
      setSelectedCharts(selectedCharts.filter(chart => chart !== chartType));
    } else {
      setSelectedCharts([...selectedCharts, chartType]);
    }
  };

  // Format data for charts
  const formatChartData = (chartType: ChartType) => {
    return metrics.history[chartType].map(item => ({
      timestamp: format(parseISO(item.timestamp), 'HH:mm'),
      value: item.value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">System Metrics</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => toggleChart('cpu')}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCharts.includes('cpu') 
                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }`}
          >
            CPU
          </button>
          <button 
            onClick={() => toggleChart('memory')}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCharts.includes('memory') 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }`}
          >
            Memory
          </button>
          <button 
            onClick={() => toggleChart('disk')}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCharts.includes('disk') 
                ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }`}
          >
            Disk
          </button>
          <button 
            onClick={() => toggleChart('active_users')}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCharts.includes('active_users') 
                ? 'bg-purple-100 text-purple-800 border-purple-200' 
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }`}
          >
            Users
          </button>
          <button 
            onClick={() => toggleChart('requests_per_minute')}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCharts.includes('requests_per_minute') 
                ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }`}
          >
            Requests/min
          </button>
          <button 
            onClick={() => toggleChart('error_rate')}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCharts.includes('error_rate') 
                ? 'bg-red-100 text-red-800 border-red-200' 
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }`}
          >
            Error Rate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Chart */}
        {selectedCharts.includes('cpu') && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-2 text-gray-700">CPU Usage (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={formatChartData('cpu')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'CPU']} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#93c5fd" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Memory Chart */}
        {selectedCharts.includes('memory') && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Memory Usage (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={formatChartData('memory')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Memory']} />
                <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#86efac" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Disk Chart */}
        {selectedCharts.includes('disk') && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Disk Usage (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={formatChartData('disk')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Disk']} />
                <Area type="monotone" dataKey="value" stroke="#eab308" fill="#fde047" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Active Users Chart */}
        {selectedCharts.includes('active_users') && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Active Users</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatChartData('active_users')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'Users']} />
                <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Requests per Minute Chart */}
        {selectedCharts.includes('requests_per_minute') && metrics.history.requests_per_minute && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Requests per Minute</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatChartData('requests_per_minute')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'Requests']} />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Error Rate Chart */}
        {selectedCharts.includes('error_rate') && metrics.history.error_rate && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Error Rate (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatChartData('error_rate')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Error Rate']} />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsCharts;
