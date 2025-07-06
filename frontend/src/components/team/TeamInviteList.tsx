import React, { useState, useEffect } from "react";
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Trash2 } from "lucide-react";

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedAt: string;
  expiresAt?: string;
  acceptedAt?: string;
}

// Mock services - replace with actual imports when available
const getTeamInvites = async (): Promise<TeamInvite[]> => [
  {
    id: "1",
    email: "john@example.com",
    role: "admin",
    status: "pending" as const,
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    email: "jane@example.com",
    role: "member",
    status: "accepted" as const,
    invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date().toISOString(),
  },
];

const resendInvite = async (id: string) => ({ success: true });
const cancelInvite = async (id: string) => ({ success: true });

interface TeamInviteListProps {
  onRefresh?: () => void;
}

const TeamInviteList: React.FC<TeamInviteListProps> = ({ onRefresh }) => {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const showToast = (title: string, type: "success" | "error" = "success") => {
    alert(`${title}`);
  };

  const loadInvites = async () => {
    try {
      setLoading(true);
      const data = await getTeamInvites();
      setInvites(data);
    } catch (err) {
      setError("Failed to load team invites");
      console.error("Error loading invites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handleResendInvite = async (invite: TeamInvite) => {
    setActionLoading(prev => ({ ...prev, [invite.id]: true }));

    try {
      await resendInvite(invite.id);
      showToast("Invitation resent successfully", "success");
      loadInvites();
    } catch (error) {
      showToast("Failed to resend invitation", "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [invite.id]: false }));
    }
  };

  const handleCancelInvite = async (invite: TeamInvite) => {
    if (!window.confirm(`Are you sure you want to cancel the invitation for ${invite.email}?`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [invite.id]: true }));

    try {
      await cancelInvite(invite.id);
      showToast("Invitation cancelled successfully", "success");
      loadInvites();
      if (onRefresh) onRefresh();
    } catch (error) {
      showToast("Failed to cancel invitation", "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [invite.id]: false }));
    }
  };

  const getStatusIcon = (status: TeamInvite['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TeamInvite['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading invites...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Team Invitations
        </h3>
      </div>

      {invites.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No team invitations found</p>
          <p className="text-sm text-gray-400">Invitations will appear here once sent</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {invite.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {invite.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invite.status)}`}>
                      {getStatusIcon(invite.status)}
                      {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invite.invitedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invite.expiresAt ? formatDate(invite.expiresAt) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {invite.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleResendInvite(invite)}
                            disabled={actionLoading[invite.id]}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {actionLoading[invite.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCancelInvite(invite)}
                            disabled={actionLoading[invite.id]}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {invite.status === 'accepted' && (
                        <span className="text-green-600 text-sm">
                          Accepted {invite.acceptedAt ? formatDate(invite.acceptedAt) : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeamInviteList;
