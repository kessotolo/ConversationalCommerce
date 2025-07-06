import React, { useState } from "react";
import { Users, UserPlus, Settings } from "lucide-react";
import TeamMemberList from "./TeamMemberList";
import TeamInviteForm from "./TeamInviteForm";
import TeamInviteList from "./TeamInviteList";

interface TeamManagementProps {
  tenantId: string;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ tenantId }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'settings'>('members');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const tabs = [
    { id: 'members', label: 'Team Members', icon: Users },
    { id: 'invites', label: 'Invitations', icon: UserPlus },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleInviteSuccess = () => {
    setShowInviteForm(false);
    // Switch to invites tab to show the new invite
    setActiveTab('invites');
  };

  return (
    <div className="p-6 bg-white rounded-lg border">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Team Management</h1>
        <button
          onClick={() => setShowInviteForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Custom Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'members' && (
          <div>
            <TeamMemberList onEdit={(member) => console.log('Edit member:', member)} />
          </div>
        )}

        {activeTab === 'invites' && (
          <div>
            <TeamInviteList onRefresh={() => { }} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Team settings are currently in development.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <h3 className="font-medium mb-2">Role Permissions</h3>
                <p className="text-gray-600 text-sm">
                  Configure what each team role can access and modify.
                </p>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-medium mb-2">Team Policies</h3>
                <p className="text-gray-600 text-sm">
                  Set up team-wide policies and guidelines.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <TeamInviteForm
              onSuccess={handleInviteSuccess}
              onCancel={() => setShowInviteForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
