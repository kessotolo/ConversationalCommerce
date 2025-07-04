import React from 'react';
import { SystemHealth } from '../../services/monitoring';
import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface SystemHealthOverviewProps {
  health: SystemHealth;
}

const SystemHealthOverview: React.FC<SystemHealthOverviewProps> = ({ health }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <ExclamationCircleIcon className="h-6 w-6 text-yellow-500" />;
      case 'critical':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <ExclamationCircleIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">System Health Overview</h2>
        <div className={`px-3 py-1 rounded-full border ${getStatusBadgeColor(health.overall_status)}`}>
          <div className="flex items-center space-x-1">
            {getStatusIcon(health.overall_status)}
            <span className="font-medium capitalize">{health.overall_status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* CPU Status */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">CPU</h3>
            {getStatusIcon(health.components.cpu.status)}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Usage</span>
              <span>{health.components.cpu.usage_percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.components.cpu.status === 'healthy'
                    ? 'bg-green-500'
                    : health.components.cpu.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${health.components.cpu.usage_percent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Memory Status */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Memory</h3>
            {getStatusIcon(health.components.memory.status)}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Usage</span>
              <span>{health.components.memory.usage_percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.components.memory.status === 'healthy'
                    ? 'bg-green-500'
                    : health.components.memory.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${health.components.memory.usage_percent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Disk Status */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Disk</h3>
            {getStatusIcon(health.components.disk.status)}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Usage</span>
              <span>{health.components.disk.usage_percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.components.disk.status === 'healthy'
                    ? 'bg-green-500'
                    : health.components.disk.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${health.components.disk.usage_percent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Database</h3>
            {getStatusIcon(health.components.database.status)}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Connections</span>
              <span>{health.components.database.connections}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.components.database.status === 'healthy'
                    ? 'bg-green-500'
                    : health.components.database.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Cache Status */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Cache</h3>
            {getStatusIcon(health.components.cache.status)}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Hit Rate</span>
              <span>{health.components.cache.hit_rate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.components.cache.status === 'healthy'
                    ? 'bg-green-500'
                    : health.components.cache.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${health.components.cache.hit_rate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date(health.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default SystemHealthOverview;
