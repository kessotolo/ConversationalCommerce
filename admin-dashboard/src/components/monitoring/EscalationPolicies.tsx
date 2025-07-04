import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  EscalationPolicy, 
  EscalationStep, 
  AlertTarget, 
  monitoringService 
} from '../../services/monitoring';

const EscalationPolicies: React.FC = () => {
  const [editingPolicy, setEditingPolicy] = useState<EscalationPolicy | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Fetch escalation policies
  const { data: escalationPolicies, error: policiesError, mutate: mutatePolicies } = useSWR(
    'escalation-policies',
    () => monitoringService.getEscalationPolicies(),
    { refreshInterval: 60000 } // Refresh every minute
  );

  // Fetch alert targets (needed for step configuration)
  const { data: alertTargets, error: targetsError } = useSWR(
    'alert-targets',
    () => monitoringService.getAlertTargets(),
    { refreshInterval: 60000 } // Refresh every minute
  );

  const handleCreatePolicy = () => {
    setEditingPolicy({
      id: `new-policy-${Date.now()}`,
      name: '',
      description: '',
      severity_levels: ['warning', 'critical'],
      steps: [
        {
          id: `new-step-${Date.now()}`,
          step_number: 1,
          targets: [],
          wait_minutes: 15
        }
      ],
      active: true
    });
  };

  const handleEditPolicy = (policy: EscalationPolicy) => {
    setEditingPolicy({ ...policy });
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    
    setSaveStatus('saving');
    
    try {
      const isNew = editingPolicy.id.startsWith('new-policy-');
      
      if (isNew) {
        // Remove the temporary ID before sending to API
        const { id, ...policyWithoutId } = editingPolicy;
        // Create proper EscalationStep objects with ids preserved for backend
        const steps = policyWithoutId.steps.map(step => {
          // Keep step id for backend to handle, it will assign proper IDs
          return {
            id: step.id,
            step_number: step.step_number,
            targets: step.targets,
            wait_minutes: step.wait_minutes
          };
        });
        
        await monitoringService.createEscalationPolicy({
          ...policyWithoutId,
          steps
        });
      } else {
        await monitoringService.updateEscalationPolicy(editingPolicy.id, editingPolicy);
      }
      
      setEditingPolicy(null);
      mutatePolicies(); // Refresh the data
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save escalation policy:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this escalation policy?')) {
      try {
        await monitoringService.deleteEscalationPolicy(id);
        mutatePolicies(); // Refresh data
      } catch (error) {
        console.error('Failed to delete escalation policy:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  const handlePolicyChange = (field: string, value: any) => {
    if (!editingPolicy) return;
    
    setEditingPolicy({
      ...editingPolicy,
      [field]: value
    });
  };

  const handleAddStep = () => {
    if (!editingPolicy) return;
    
    const newStep: EscalationStep = {
      id: `new-step-${Date.now()}`,
      step_number: editingPolicy.steps.length + 1,
      targets: [],
      wait_minutes: 15
    };
    
    setEditingPolicy({
      ...editingPolicy,
      steps: [...editingPolicy.steps, newStep]
    });
  };

  const handleRemoveStep = (stepId: string) => {
    if (!editingPolicy) return;
    
    const updatedSteps = editingPolicy.steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({
        ...step,
        step_number: index + 1
      }));
    
    setEditingPolicy({
      ...editingPolicy,
      steps: updatedSteps
    });
  };

  const handleStepChange = (stepId: string, field: string, value: any) => {
    if (!editingPolicy) return;
    
    const updatedSteps = editingPolicy.steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          [field]: value
        };
      }
      return step;
    });
    
    setEditingPolicy({
      ...editingPolicy,
      steps: updatedSteps
    });
  };

  if (policiesError || targetsError) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
        <p>Error loading escalation policies or alert targets. Please try again later.</p>
      </div>
    );
  }

  if (!escalationPolicies || !alertTargets) {
    return <div className="p-4 text-center">Loading escalation policies...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Escalation Policies</h2>
          <button
            onClick={handleCreatePolicy}
            disabled={!!editingPolicy}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Create New Policy
          </button>
        </div>
        
        {saveStatus === 'success' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
            Escalation policy saved successfully!
          </div>
        )}
        
        {saveStatus === 'error' && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            Failed to save escalation policy. Please try again.
          </div>
        )}
        
        {editingPolicy && (
          <div className="mb-6 p-6 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {editingPolicy.id.startsWith('new-policy-') ? 'Create Escalation Policy' : 'Edit Escalation Policy'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingPolicy.name}
                  onChange={(e) => handlePolicyChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Production System Alerts"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingPolicy.description}
                  onChange={(e) => handlePolicyChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Escalation policy for critical production system alerts"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity Levels</label>
                <div className="flex flex-wrap gap-2">
                  {(['info', 'warning', 'critical'] as const).map((severity) => (
                    <label key={severity} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={editingPolicy.severity_levels.includes(severity)}
                        onChange={(e) => {
                          const newLevels = e.target.checked
                            ? [...editingPolicy.severity_levels, severity]
                            : editingPolicy.severity_levels.filter(s => s !== severity);
                          handlePolicyChange('severity_levels', newLevels);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="ml-2 mr-4 text-sm text-gray-700 capitalize">{severity}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Escalation Steps</label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add Step
                  </button>
                </div>
                
                <div className="space-y-4">
                  {editingPolicy.steps.map((step) => (
                    <div key={step.id} className="border border-gray-200 rounded-md p-4 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          Step {step.step_number}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(step.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          disabled={editingPolicy.steps.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Wait Time (minutes)
                          </label>
                          <input
                            type="number"
                            value={step.wait_minutes}
                            onChange={(e) => handleStepChange(step.id, 'wait_minutes', parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Time to wait before escalating to this step
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notification Targets
                          </label>
                          <select
                            multiple
                            value={step.targets}
                            onChange={(e) => {
                              const options = Array.from(e.target.selectedOptions, option => option.value);
                              handleStepChange(step.id, 'targets', options);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                          >
                            {alertTargets.map((target) => (
                              <option key={target.id} value={target.id}>
                                {target.name} ({target.type})
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Hold Ctrl/Cmd to select multiple
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="policy-active"
                  checked={editingPolicy.active}
                  onChange={(e) => handlePolicyChange('active', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="policy-active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingPolicy(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={!editingPolicy.name || editingPolicy.severity_levels.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Levels</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Steps</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {escalationPolicies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No escalation policies configured. Create a policy to get started.
                  </td>
                </tr>
              ) : (
                escalationPolicies.map((policy) => (
                  <tr key={policy.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                      <div className="text-xs text-gray-500">{policy.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {policy.severity_levels.map((level) => (
                          <span key={level} className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${level === 'critical' ? 'bg-red-100 text-red-800' :
                              level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'}`}
                          >
                            {level}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {policy.steps.length} {policy.steps.length === 1 ? 'step' : 'steps'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        policy.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {policy.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditPolicy(policy)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        disabled={!!editingPolicy}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={!!editingPolicy}
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

export default EscalationPolicies;
