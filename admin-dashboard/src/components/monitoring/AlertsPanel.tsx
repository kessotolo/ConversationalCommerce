import React from 'react';
import { Alert } from '../../services/monitoring';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
import { format, parseISO } from 'date-fns';

interface AlertsPanelProps {
  alerts: Alert[];
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  // Sort alerts by severity and then by timestamp (newest first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Get alert icon based on severity
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'high':
        return <ExclamationCircleIcon className="h-5 w-5 text-orange-500" />;
      case 'medium':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get alert background color based on severity
  const getAlertBackground = (severity: string, status: string) => {
    if (status === 'resolved') return 'bg-gray-50';
    
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return format(parseISO(timestamp), 'MMM d, h:mm a');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Active Alerts</h2>
        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
          {alerts.filter(alert => alert.status === 'active').length} active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CheckCircleIcon className="h-12 w-12 mb-2 text-green-500" />
          <p>No alerts at this time</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {sortedAlerts.map(alert => (
            <div 
              key={alert.id} 
              className={`p-3 rounded-lg border ${getAlertBackground(alert.severity, alert.status)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  {getAlertIcon(alert.severity)}
                  <span className={`text-sm font-medium ${alert.status === 'resolved' ? 'text-gray-500' : 'text-gray-900'}`}>
                    {alert.title}
                  </span>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                  alert.status === 'resolved' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-800'
                }`}>
                  {alert.status}
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mt-2 ml-7">{alert.description}</p>
              
              <div className="flex items-center mt-2 ml-7 text-xs text-gray-500">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>{formatTimestamp(alert.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
