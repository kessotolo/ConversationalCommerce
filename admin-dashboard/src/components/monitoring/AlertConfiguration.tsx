import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { monitoringService, AlertRule } from '../../services/monitoring';

interface AlertConfigurationProps {
  onRuleChange?: (rules: AlertRule[]) => void;
}

const AlertConfiguration: React.FC<AlertConfigurationProps> = ({ onRuleChange }) => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Fetch alert rules from the API
  const { data: apiRules, error, mutate } = useSWR(
    'alert-rules',
    () => monitoringService.getAlertRules(),
    { refreshInterval: 60000 } // Refresh every minute
  );

  useEffect(() => {
    if (apiRules) {
      setRules(apiRules);
      if (onRuleChange) {
        onRuleChange(apiRules);
      }
    }
  }, [apiRules, onRuleChange]);

  const handleEditRule = (rule: AlertRule) => {
    setEditingRule({ ...rule });
    setIsEditing(true);
  };

  const handleCreateNewRule = () => {
    setEditingRule({
      id: `new-rule-${Date.now()}`,
      name: '',
      description: '',
      metric: 'cpu_usage',
      condition: 'threshold',
      threshold: {
        operator: '>',
        value: 80,
        duration_seconds: 300, // 5 minutes
      },
      severity: 'warning',
      actions: ['notify'],
      enabled: true,
      created_at: new Date().toISOString(),
    });
    setIsEditing(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this alert rule?')) {
      try {
        await monitoringService.deleteAlertRule(ruleId);
        mutate(); // Refresh data
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('Failed to delete alert rule:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    
    setSaveStatus('saving');
    
    try {
      const isNew = editingRule.id.startsWith('new-rule-');
      
      if (isNew) {
        // Remove the temporary ID before sending to API
        const { id, ...ruleWithoutId } = editingRule;
        await monitoringService.createAlertRule(ruleWithoutId);
      } else {
        await monitoringService.updateAlertRule(editingRule.id, editingRule);
      }
      
      setIsEditing(false);
      setEditingRule(null);
      mutate(); // Refresh the data
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save alert rule:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleRuleChange = (field: string, value: any) => {
    if (!editingRule) return;
    
    if (field.includes('.')) {
      // Handle nested properties like threshold.value
      const [parent, child] = field.split('.');
      setEditingRule({
        ...editingRule,
        [parent]: {
          ...editingRule[parent],
          [child]: value
        }
      });
    } else {
      setEditingRule({
        ...editingRule,
        [field]: value
      });
    }
  };

  const handleToggleRuleStatus = async (rule: AlertRule) => {
    try {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      await monitoringService.updateAlertRule(rule.id, updatedRule);
      mutate(); // Refresh data
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
        <p>Error loading alert rules. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Alert Configuration</h2>
          {!isEditing && (
            <button
              onClick={handleCreateNewRule}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create New Alert Rule
            </button>
          )}
        </div>
        
        {saveStatus === 'success' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 my-4 rounded">
            Alert rule changes saved successfully!
          </div>
        )}
        
        {saveStatus === 'error' && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 rounded">
            Failed to save alert rule changes. Please try again.
          </div>
        )}
      </div>
      
      {isEditing && editingRule && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            {editingRule.id.startsWith('new-rule-') ? 'Create New Alert Rule' : 'Edit Alert Rule'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={editingRule.name}
                onChange={(e) => handleRuleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., High CPU Usage"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={editingRule.severity}
                onChange={(e) => handleRuleChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingRule.description}
                onChange={(e) => handleRuleChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this alert is monitoring for"
                rows={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
              <select
                value={editingRule.metric}
                onChange={(e) => handleRuleChange('metric', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cpu_usage">CPU Usage</option>
                <option value="memory_usage">Memory Usage</option>
                <option value="disk_usage">Disk Usage</option>
                <option value="active_users">Active Users</option>
                <option value="requests_per_minute">Requests per Minute</option>
                <option value="error_rate">Error Rate</option>
                <option value="response_time">Response Time</option>
                <option value="database_connections">Database Connections</option>
                <option value="cache_hit_ratio">Cache Hit Ratio</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition Type</label>
              <select
                value={editingRule.condition}
                onChange={(e) => handleRuleChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="threshold">Threshold</option>
                <option value="anomaly">Anomaly</option>
                <option value="rate_of_change">Rate of Change</option>
              </select>
            </div>
            
            {editingRule.condition === 'threshold' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <select
                    value={editingRule.threshold?.operator || '>'}
                    onChange={(e) => handleRuleChange('threshold.operator', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value=">">Greater than</option>
                    <option value="<">Less than</option>
                    <option value=">=">Greater than or equal to</option>
                    <option value="<=">Less than or equal to</option>
                    <option value="=">Equal to</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold Value</label>
                  <input
                    type="number"
                    value={editingRule.threshold?.value || 0}
                    onChange={(e) => handleRuleChange('threshold.value', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (seconds before alerting)
                  </label>
                  <input
                    type="number"
                    value={editingRule.threshold?.duration_seconds || 300}
                    onChange={(e) => handleRuleChange('threshold.duration_seconds', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    The condition must be true for this many seconds before an alert is triggered
                  </p>
                </div>
              </>
            )}
            
            {editingRule.condition === 'anomaly' && (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Anomaly Detection Sensitivity</label>
                <select
                  value={editingRule.anomaly?.sensitivity || 'medium'}
                  onChange={(e) => handleRuleChange('anomaly.sensitivity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low (3+ standard deviations)</option>
                  <option value="medium">Medium (2+ standard deviations)</option>
                  <option value="high">High (1.5+ standard deviations)</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Anomaly detection will alert when the metric value deviates significantly from normal patterns
                </p>
              </div>
            )}
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="action-notify"
                    checked={editingRule.actions.includes('notify')}
                    onChange={(e) => {
                      const newActions = e.target.checked 
                        ? [...editingRule.actions, 'notify'] 
                        : editingRule.actions.filter(a => a !== 'notify');
                      handleRuleChange('actions', newActions);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <label htmlFor="action-notify" className="ml-2 text-sm text-gray-700">Send notification</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="action-email"
                    checked={editingRule.actions.includes('email')}
                    onChange={(e) => {
                      const newActions = e.target.checked 
                        ? [...editingRule.actions, 'email'] 
                        : editingRule.actions.filter(a => a !== 'email');
                      handleRuleChange('actions', newActions);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <label htmlFor="action-email" className="ml-2 text-sm text-gray-700">Send email</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="action-log"
                    checked={editingRule.actions.includes('log')}
                    onChange={(e) => {
                      const newActions = e.target.checked 
                        ? [...editingRule.actions, 'log'] 
                        : editingRule.actions.filter(a => a !== 'log');
                      handleRuleChange('actions', newActions);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <label htmlFor="action-log" className="ml-2 text-sm text-gray-700">Write to audit log</label>
                </div>
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rule-enabled"
                  checked={editingRule.enabled}
                  onChange={(e) => handleRuleChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="rule-enabled" className="ml-2 text-sm text-gray-700">Enable this rule</label>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingRule(null);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRule}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </div>
      )}
      
      {!isEditing && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rule Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!rules.length ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No alert rules configured. Click "Create New Alert Rule" to get started.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      <div className="text-xs text-gray-500">{rule.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.metric.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.condition === 'threshold' && (
                        <span>
                          {rule.threshold?.operator} {rule.threshold?.value} 
                          {rule.threshold?.duration_seconds && (
                            <span className="text-xs"> for {rule.threshold.duration_seconds}s</span>
                          )}
                        </span>
                      )}
                      {rule.condition === 'anomaly' && (
                        <span>Anomaly ({rule.anomaly?.sensitivity || 'medium'})</span>
                      )}
                      {rule.condition === 'rate_of_change' && (
                        <span>Rate of change</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          rule.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'}`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRuleStatus(rule)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                          ${rule.enabled ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                          ${rule.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AlertConfiguration;
