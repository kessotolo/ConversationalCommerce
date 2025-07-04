import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { monitoringService } from '../../services/monitoring';
import SystemHealthOverview from './SystemHealthOverview';
import MetricsCharts from './MetricsCharts';
import AlertsPanel from './AlertsPanel';
import SystemResourcesPanel from './SystemResourcesPanel';
import SystemStatusIndicators from './SystemStatusIndicators';
import TrendAnalysis from './TrendAnalysis';
import AlertRouting from './AlertRouting';

const SystemHealthDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  const [selectedMetric, setSelectedMetric] = useState('cpu_usage');
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'trends', 'details', 'alerts'

  // Fetch system health data
  const { data: healthData, error: healthError } = useSWR(
    'system-health',
    () => monitoringService.getSystemHealth(),
    { refreshInterval }
  );

  // Fetch metrics data
  const { data: metricsData, error: metricsError } = useSWR(
    'system-metrics',
    () => monitoringService.getMetrics(),
    { refreshInterval }
  );

  // Fetch alerts
  const { data: alertsData, error: alertsError } = useSWR(
    'system-alerts',
    () => monitoringService.getAlerts(),
    { refreshInterval }
  );

  // Fetch system info
  const { data: systemInfo } = useSWR(
    'system-info',
    () => monitoringService.getSystemInfo(),
    { refreshInterval: refreshInterval * 2 } // Less frequent updates for system info
  );

  // Handle refresh interval change
  const handleRefreshIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(Number(event.target.value));
  };

  // Prepare trend data based on selected metric
  const getTrendData = () => {
    if (!metricsData) return null;
    
    let data: Array<{timestamp: string; value: number}> = [];
    let unit = '';
    let threshold: {warning: number; critical: number} | undefined = undefined;
    
    switch (selectedMetric) {
      case 'cpu_usage':
        data = metricsData.history.cpu;
        unit = '%';
        threshold = { warning: 70, critical: 90 };
        break;
      case 'memory_usage':
        data = metricsData.history.memory;
        unit = '%';
        threshold = { warning: 80, critical: 95 };
        break;
      case 'disk_usage':
        data = metricsData.history.disk;
        unit = '%';
        threshold = { warning: 85, critical: 95 };
        break;
      case 'active_users':
        data = metricsData.history.active_users;
        unit = 'users';
        break;
      case 'requests_per_minute':
        data = metricsData.history.requests_per_minute || [];
        unit = 'req/min';
        break;
      case 'error_rate':
        data = metricsData.history.error_rate || [];
        unit = '%';
        threshold = { warning: 5, critical: 10 };
        break;
      default:
        data = metricsData.history.cpu;
        unit = '%';
    }
    
    return {
      metric: selectedMetric,
      data,
      threshold,
      unit
    };
  };

  if (healthError || metricsError || alertsError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Failed to load monitoring data. Please check API connection.</span>
        </div>
      </div>
    );
  }

  if (!healthData || !metricsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-indigo-500">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading monitoring data...
        </div>
      </div>
    );
  }

  // Trend data for the selected metric
  const trendData = getTrendData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Health & Observability</h1>
        <div className="flex items-center space-x-2">
          <label htmlFor="refresh-interval" className="text-sm text-gray-600">
            Refresh every:
          </label>
          <select
            id="refresh-interval"
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
            className="border rounded-md shadow-sm px-3 py-2 text-sm"
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="mb-6">
        <SystemStatusIndicators 
          health={healthData} 
          alerts={alertsData?.alerts || []} 
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm mr-2 ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-2 font-medium text-sm mr-2 ${
            activeTab === 'trends'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Trend Analysis
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium text-sm mr-2 ${
            activeTab === 'details'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Detailed Metrics
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'alerts'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Alert Management
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* System Health Overview */}
          <div className="mb-6">
            <SystemHealthOverview health={healthData} />
          </div>

          {/* Metrics Charts */}
          <div className="mb-6">
            <MetricsCharts metrics={metricsData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Resources Panel */}
            <div className="lg:col-span-2">
              <SystemResourcesPanel metrics={metricsData} />
            </div>

            {/* Alerts Panel */}
            <div className="lg:col-span-1">
              <AlertsPanel alerts={alertsData?.alerts || []} />
            </div>
          </div>
        </>
      )}

      {/* Alert Management Tab */}
      {activeTab === 'alerts' && (
        <div className="mb-6">
          <AlertRouting />
        </div>
      )}
      
      {activeTab === 'trends' && (
        <>
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-4">
                <label htmlFor="metric-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Metric for Trend Analysis
                </label>
                <select
                  id="metric-select"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="border rounded-md shadow-sm px-3 py-2 text-sm w-full md:w-64"
                >
                  <option value="cpu_usage">CPU Usage</option>
                  <option value="memory_usage">Memory Usage</option>
                  <option value="disk_usage">Disk Usage</option>
                  <option value="active_users">Active Users</option>
                  <option value="requests_per_minute">Requests per Minute</option>
                  <option value="error_rate">Error Rate</option>
                </select>
              </div>
            </div>
          </div>
          {trendData && (
            <div className="mb-6">
              <TrendAnalysis 
                trendData={trendData}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Alerts for Context */}
            <div className="lg:col-span-1">
              <AlertsPanel alerts={alertsData?.alerts.slice(0, 5) || []} />
            </div>
            
            {/* System Resources Summary */}
            <div className="lg:col-span-2">
              <SystemResourcesPanel metrics={metricsData} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'details' && (
        <>
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Detailed System Information</h2>
              {systemInfo ? (
                <div className="space-y-6">
                  {/* System Details */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">System</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Platform</div>
                        <div className="text-base">{systemInfo.platform} {systemInfo.platform_release}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Architecture</div>
                        <div className="text-base">{systemInfo.architecture}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Python Version</div>
                        <div className="text-base">{systemInfo.python_version}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Hostname</div>
                        <div className="text-base">{systemInfo.hostname}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">CPU</div>
                        <div className="text-base">{systemInfo.processor} ({systemInfo.cpu_count} cores)</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Boot Time</div>
                        <div className="text-base">{new Date(systemInfo.boot_time * 1000).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Memory Details */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Memory</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Total Memory</div>
                        <div className="text-base">{(systemInfo.memory.total / (1024 * 1024 * 1024)).toFixed(2)} GB</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Used Memory</div>
                        <div className="text-base">{(systemInfo.memory.used / (1024 * 1024 * 1024)).toFixed(2)} GB</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-500">Available Memory</div>
                        <div className="text-base">{(systemInfo.memory.available / (1024 * 1024 * 1024)).toFixed(2)} GB</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Disk Details */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Disk Usage</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partition</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Free</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(systemInfo.disk).map(([partition, data]: [string, any]) => (
                            <tr key={partition}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{partition}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {(data.total / (1024 * 1024 * 1024)).toFixed(2)} GB
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {(data.used / (1024 * 1024 * 1024)).toFixed(2)} GB
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {(data.free / (1024 * 1024 * 1024)).toFixed(2)} GB
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <span className="mr-2">{data.percent}%</span>
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        data.percent < 70 ? 'bg-green-500' : 
                                        data.percent < 90 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`} 
                                      style={{ width: `${data.percent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Network Interfaces */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Network</h3>
                    <div className="text-sm text-gray-500 mb-2">
                      Active Network Connections: <span className="font-semibold">{systemInfo.network.connections}</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interface</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speed</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {systemInfo.network.interfaces.map((iface) => (
                            <tr key={iface.name}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{iface.name}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  iface.isup ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {iface.isup ? 'Up' : 'Down'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {iface.addresses.map((addr: any, idx: number) => 
                                  addr.family === 'IPv4' && (
                                    <div key={idx}>{addr.address}</div>
                                  )
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {iface.speed > 0 ? `${iface.speed} Mbps` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">Loading system information...</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemHealthDashboard;
