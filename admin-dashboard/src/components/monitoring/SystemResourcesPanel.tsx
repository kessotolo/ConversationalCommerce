import React, { useState } from 'react';
import { MetricsSnapshot } from '../../services/monitoring';
import { ServerIcon, CpuChipIcon, CircleStackIcon } from '@heroicons/react/24/outline';

interface SystemResourcesPanelProps {
  metrics: MetricsSnapshot;
}

type ResourceTab = 'system' | 'application' | 'database';

const SystemResourcesPanel: React.FC<SystemResourcesPanelProps> = ({ metrics }) => {
  const [activeTab, setActiveTab] = useState<ResourceTab>('system');

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 h-full">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center px-4 py-3 text-sm font-medium ${
            activeTab === 'system'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ServerIcon className="h-4 w-4 mr-2" />
          System Resources
        </button>
        <button
          onClick={() => setActiveTab('application')}
          className={`flex items-center px-4 py-3 text-sm font-medium ${
            activeTab === 'application'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CpuChipIcon className="h-4 w-4 mr-2" />
          Application
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center px-4 py-3 text-sm font-medium ${
            activeTab === 'database'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CircleStackIcon className="h-4 w-4 mr-2" />
          Database & Cache
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'system' && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">System Resources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* CPU Usage */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center mb-2">
                  <CpuChipIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <h4 className="text-sm font-medium text-gray-700">CPU Usage</h4>
                </div>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-gray-800">
                    {metrics.current.system.cpu_usage.toFixed(1)}%
                  </span>
                  <span className="ml-2 text-xs text-gray-500">of total CPU capacity</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.current.system.cpu_usage < 70
                        ? 'bg-green-500'
                        : metrics.current.system.cpu_usage < 90
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(metrics.current.system.cpu_usage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h4 className="text-sm font-medium text-gray-700">Memory Usage</h4>
                </div>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-gray-800">
                    {metrics.current.system.memory_usage_percent.toFixed(1)}%
                  </span>
                  <span className="ml-2 text-xs text-gray-500">of total memory</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.current.system.memory_usage_percent < 70
                        ? 'bg-green-500'
                        : metrics.current.system.memory_usage_percent < 90
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(metrics.current.system.memory_usage_percent, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Disk Usage */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h4 className="text-sm font-medium text-gray-700">Disk Usage</h4>
                </div>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-gray-800">
                    {metrics.current.system.disk_usage_percent.toFixed(1)}%
                  </span>
                  <span className="ml-2 text-xs text-gray-500">of total disk space</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.current.system.disk_usage_percent < 70
                        ? 'bg-green-500'
                        : metrics.current.system.disk_usage_percent < 90
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(metrics.current.system.disk_usage_percent, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Process Count */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h4 className="text-sm font-medium text-gray-700">Process Count</h4>
                </div>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-gray-800">
                    {metrics.current.system.process_count}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">active processes</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'application' && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Application Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Active Users */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Active Users</h4>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-gray-800">
                    {metrics.current.application.active_users_total}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">users</span>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Active Sessions</h4>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-gray-800">
                    {metrics.current.application.active_sessions}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">sessions</span>
                </div>
              </div>

              {/* Users by Tenant */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Users by Tenant</h4>
                <div className="max-h-32 overflow-y-auto">
                  {Object.entries(metrics.current.application.active_users_by_tenant).map(([tenant, count]) => (
                    <div key={tenant} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-600">{tenant}</span>
                      <span className="font-medium text-gray-800">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Database & Cache Metrics</h3>
            <p className="text-gray-500 text-sm italic mb-4">
              Note: Detailed database and cache metrics will be available soon.
            </p>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
              <div className="flex">
                <div className="py-1">
                  <svg className="h-5 w-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm">Database and cache metrics integration is in progress. This panel will display query performance, connection pool status, and cache hit rates once implemented.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemResourcesPanel;
