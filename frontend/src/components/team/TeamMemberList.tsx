import React, { useState, useEffect } from "react";
import { ChevronDown, Edit, Trash2, Users } from "lucide-react";

// Mock services and types - replace with actual imports when available
enum TeamMemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  SUPPORT = "support",
  VIEWER = "viewer",
}

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: TeamMemberRole;
  is_active: boolean;
}

const getTeamMembers = async (): Promise<TeamMember[]> => [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: TeamMemberRole.OWNER,
    is_active: true,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: TeamMemberRole.ADMIN,
    is_active: true,
  },
  {
    id: "3",
    name: "Bob Johnson",
    phone: "+1234567890",
    role: TeamMemberRole.MEMBER,
    is_active: false,
  },
];

const removeTeamMember = async (id: string) => ({ success: true });

interface TeamMemberListProps {
  onEdit: (member: TeamMember) => void;
}

const getRoleBadgeColor = (role: TeamMemberRole): string => {
  switch (role) {
    case TeamMemberRole.OWNER:
      return "bg-purple-100 text-purple-800";
    case TeamMemberRole.ADMIN:
      return "bg-red-100 text-red-800";
    case TeamMemberRole.MEMBER:
      return "bg-blue-100 text-blue-800";
    case TeamMemberRole.SUPPORT:
      return "bg-green-100 text-green-800";
    case TeamMemberRole.VIEWER:
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const TeamMemberList: React.FC<TeamMemberListProps> = ({ onEdit }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const showToast = (title: string, type: "success" | "error" = "success") => {
    alert(`${title}`);
  };

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const data = await getTeamMembers();
      setMembers(data);
    } catch (err) {
      setError("Error loading team members");
      console.error("Error loading team members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleRemove = (member: TeamMember) => {
    setMemberToRemove(member);
    setShowConfirmDialog(true);
    setDropdownOpen(null);
  };

  const confirmRemove = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      await removeTeamMember(memberToRemove.id);
      showToast("Team member removed", "success");
      setMembers(members.filter(m => m.id !== memberToRemove.id));
    } catch (err) {
      showToast("Error removing team member", "error");
    } finally {
      setIsRemoving(false);
      setShowConfirmDialog(false);
      setMemberToRemove(null);
    }
  };

  const handleEdit = (member: TeamMember) => {
    onEdit(member);
    setDropdownOpen(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading team members...</span>
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
          <Users className="h-5 w-5" />
          Team Members
        </h3>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No team members found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email / Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {member.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {member.email || member.phone || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                      {member.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${member.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === member.id ? null : member.id)}
                        className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      {dropdownOpen === member.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleEdit(member)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Role
                            </button>
                            <button
                              onClick={() => handleRemove(member)}
                              disabled={member.role === TeamMemberRole.OWNER}
                              className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${member.role === TeamMemberRole.OWNER
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-700 hover:bg-red-50'
                                }`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Remove Team Member</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove {memberToRemove?.name} from the team? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                disabled={isRemoving}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isRemoving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setDropdownOpen(null)}
        ></div>
      )}
    </div>
  );
};

export default TeamMemberList;
