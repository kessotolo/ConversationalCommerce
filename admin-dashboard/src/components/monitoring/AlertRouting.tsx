import React, { useState } from 'react';
import AlertTargets from './AlertTargets';
import EscalationPolicies from './EscalationPolicies';

const AlertRouting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'targets' | 'policies'>('targets');

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Alert Routing & Escalation</h2>
        
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('targets')}
              className={`mr-8 py-4 px-1 ${
                activeTab === 'targets'
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Alert Targets
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`py-4 px-1 ${
                activeTab === 'policies'
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Escalation Policies
            </button>
          </nav>
        </div>
        
        {activeTab === 'targets' && <AlertTargets />}
        {activeTab === 'policies' && <EscalationPolicies />}
      </div>
    </div>
  );
};

export default AlertRouting;
