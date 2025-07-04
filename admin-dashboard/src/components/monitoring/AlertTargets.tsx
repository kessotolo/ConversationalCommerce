import React, { useState } from 'react';
import useSWR from 'swr';
import { AlertTarget, monitoringService } from '../../services/monitoring';

const AlertTargets: React.FC = () => {
  const [editingTarget, setEditingTarget] = useState<AlertTarget | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Fetch alert targets
  const { data: alertTargets, error, mutate } = useSWR(
    'alert-targets',
    () => monitoringService.getAlertTargets(),
    { refreshInterval: 60000 } // Refresh every minute
  );

  const handleCreateTarget = () => {
    setEditingTarget({
      id: `new-target-${Date.now()}`,
      name: '',
      type: 'email',
      destination: '',
      active: true
    });
  };

  const handleEditTarget = (target: AlertTarget) => {
    setEditingTarget({ ...target });
  };

  const handleSaveTarget = async () => {
    if (!editingTarget) return;
    
    setSaveStatus('saving');
    
    try {
      const isNew = editingTarget.id.startsWith('new-target-');
      
      if (isNew) {
        // Remove the temporary ID before sending to API
        const { id, ...targetWithoutId } = editingTarget;
        await monitoringService.createAlertTarget(targetWithoutId);
      } else {
        await monitoringService.updateAlertTarget(editingTarget.id, editingTarget);
      }
      
      setEditingTarget(null);
      mutate(); // Refresh the data
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save alert target:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeleteTarget = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this alert target?')) {
      try {
        await monitoringService.deleteAlertTarget(id);
        mutate(); // Refresh data
      } catch (error) {
        console.error('Failed to delete alert target:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  const handleTargetChange = (field: string, value: any) => {
    if (!editingTarget) return;
    
    setEditingTarget({
      ...editingTarget,
      [field]: value
    });
  };

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
        <p>Error loading alert targets. Please try again later.</p>
      </div>
    );
  }

  if (!alertTargets) {
    return <div className="p-4 text-center">Loading alert targets...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Alert Targets</h2>
          <button
            onClick={handleCreateTarget}
            disabled={!!editingTarget}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Create New Target
          </button>
        </div>
        
        {saveStatus === 'success' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
            Alert target saved successfully!
          </div>
        )}
        
        {saveStatus === 'error' && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            Failed to save alert target. Please try again.
          </div>
        )}
        
        {editingTarget && (
          <div className="mb-6 p-6 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {editingTarget.id.startsWith('new-target-') ? 'Create Alert Target' : 'Edit Alert Target'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingTarget.name}
                  onChange={(e) => handleTargetChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="On-call Team"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
                <select
                  value={editingTarget.type}
                  onChange={(e) => handleTargetChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="email">Email</option>
                  <option value="slack">Slack Channel</option>
                  <option value="webhook">Webhook</option>
                  <option value="pagerduty">PagerDuty</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input
                  type="text"
                  value={editingTarget.destination}
                  onChange={(e) => handleTargetChange('destination', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={
                    editingTarget.type === 'email' ? 'team@example.com' :
                    editingTarget.type === 'slack' ? '#alerts-channel' :
                    editingTarget.type === 'webhook' ? 'https://example.com/webhook' :
                    editingTarget.type === 'pagerduty' ? 'Service Integration Key' :
                    '+1234567890'
                  }
                />
              </div>
              
              <div>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="target-active"
                    checked={editingTarget.active}
                    onChange={(e) => handleTargetChange('active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <label htmlFor="target-active" className="ml-2 text-sm text-gray-700">Active</label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingTarget(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTarget}
                disabled={!editingTarget.name || !editingTarget.destination}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Target'}
              </button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alertTargets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No alert targets configured. Create a target to get started.
                  </td>
                </tr>
              ) : (
                alertTargets.map((target) => (
                  <tr key={target.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{target.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {target.type.charAt(0).toUpperCase() + target.type.slice(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">{target.destination}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        target.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {target.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditTarget(target)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        disabled={!!editingTarget}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTarget(target.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={!!editingTarget}
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
      </div>
    </div>
  );
};

export default AlertTargets;
