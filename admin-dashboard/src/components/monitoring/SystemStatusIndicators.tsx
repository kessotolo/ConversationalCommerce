import React from 'react';
import { SystemHealth, Alert } from '../../services/monitoring';

interface SystemStatusIndicatorsProps {
  health: SystemHealth;
  alerts: Alert[];
}

const SystemStatusIndicators: React.FC<SystemStatusIndicatorsProps> = ({ health, alerts }) => {
  // Count alerts by severity
  const alertCounts = {
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    high: alerts.filter(a => a.severity === 'high' && a.status === 'active').length,
    medium: alerts.filter(a => a.severity === 'medium' && a.status === 'active').length,
    low: alerts.filter(a => a.severity === 'low' && a.status === 'active').length
  };

  // Determine overall system status based on health data and active alerts
  const determineSystemStatus = () => {
    if (health.overall_status === 'critical' || alertCounts.critical > 0) {
      return {
        status: 'critical',
        message: 'System is in critical state and requires immediate attention',
        color: 'bg-red-500',
        textColor: 'text-red-800',
        bgColor: 'bg-red-100'
      };
    } else if (health.overall_status === 'warning' || alertCounts.high > 0) {
      return {
        status: 'warning',
        message: 'System requires attention - performance issues detected',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-800',
        bgColor: 'bg-yellow-100'
      };
    } else if (alertCounts.medium > 0 || alertCounts.low > 0) {
      return {
        status: 'attention',
        message: 'System is operational but has non-critical issues',
        color: 'bg-blue-500',
        textColor: 'text-blue-800',
        bgColor: 'bg-blue-100'
      };
    } else {
      return {
        status: 'healthy',
        message: 'All systems operational',
        color: 'bg-green-500',
        textColor: 'text-green-800',
        bgColor: 'bg-green-100'
      };
    }
  };

  const systemStatus = determineSystemStatus();

  // Convert timestamp to relative time (e.g., "5 minutes ago")
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* System Status Banner */}
      <div className={`px-6 py-4 ${systemStatus.bgColor} border-b border-gray-200`}>
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full ${systemStatus.color} mr-2`}></div>
          <h2 className={`font-medium ${systemStatus.textColor}`}>
            {systemStatus.status.toUpperCase()}: {systemStatus.message}
          </h2>
        </div>
      </div>
      
      {/* Status Indicators Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* CPU Status */}
          <StatusCard 
            title="CPU" 
            status={health.components.cpu.status} 
            value={`${health.components.cpu.usage_percent.toFixed(1)}%`} 
            timestamp={health.timestamp}
          />
          
          {/* Memory Status */}
          <StatusCard 
            title="Memory" 
            status={health.components.memory.status} 
            value={`${health.components.memory.usage_percent.toFixed(1)}%`} 
            timestamp={health.timestamp}
          />
          
          {/* Disk Status */}
          <StatusCard 
            title="Disk" 
            status={health.components.disk.status} 
            value={`${health.components.disk.usage_percent.toFixed(1)}%`} 
            timestamp={health.timestamp}
          />
          
          {/* Database Status */}
          <StatusCard 
            title="Database" 
            status={health.components.database.status} 
            value={`${health.components.database.connections} conn`} 
            timestamp={health.timestamp}
          />
          
          {/* Cache Status */}
          <StatusCard 
            title="Cache" 
            status={health.components.cache.status} 
            value={`${health.components.cache.hit_rate.toFixed(1)}% hit`} 
            timestamp={health.timestamp}
          />
          
          {/* Alerts Status */}
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">Alerts</h3>
              <div className={`h-2 w-2 rounded-full ${
                alertCounts.critical > 0 
                  ? 'bg-red-500' 
                  : alertCounts.high > 0 
                  ? 'bg-yellow-500' 
                  : alertCounts.medium > 0 || alertCounts.low > 0 
                  ? 'bg-blue-500' 
                  : 'bg-green-500'
              }`}></div>
            </div>
            <div className="mt-1">
              <div className="text-lg font-semibold text-gray-900">
                {alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low}
              </div>
              <div className="text-xs text-gray-500">Active alerts</div>
            </div>
            <div className="flex mt-2 space-x-1">
              {alertCounts.critical > 0 && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                  {alertCounts.critical} critical
                </span>
              )}
              {alertCounts.high > 0 && (
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                  {alertCounts.high} high
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          Last updated: {getRelativeTime(health.timestamp)}
        </div>
      </div>
    </div>
  );
};

// Status card component for individual services
interface StatusCardProps {
  title: string;
  status: string;
  value: string;
  timestamp: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, status, value, timestamp }) => {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <div className={`h-2 w-2 rounded-full ${getStatusColor(status)}`}></div>
      </div>
      <div className="mt-1">
        <div className="text-lg font-semibold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 capitalize">{status}</div>
      </div>
    </div>
  );
};

export default SystemStatusIndicators;
