import React, { useState } from "react";
import { Mail, Send, UserPlus } from "lucide-react";

// Mock services - replace with actual imports when available
const sendTeamInvite = async (data: any) => data;

interface TeamInviteFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface InviteFormData {
  email: string;
  role: string;
  message?: string;
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
];

const TeamInviteForm: React.FC<TeamInviteFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<InviteFormData>({
    email: "",
    role: "member",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = (title: string, type: "success" | "error" = "success") => {
    alert(`${title}`);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await sendTeamInvite({
        email: formData.email,
        role: formData.role,
        message: formData.message,
      });

      showToast("Team invite sent successfully", "success");

      // Reset form
      setFormData({
        email: "",
        role: "member",
        message: "",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to send invite",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof InviteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <UserPlus className="h-5 w-5" />
        Invite Team Member
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`block w-full px-3 py-2 pl-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.email ? "border-red-300" : "border-gray-300"
                }`}
            />
            <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            We'll send an invitation to this email address
          </p>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => handleInputChange("role", e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.role ? "border-red-300" : "border-gray-300"
              }`}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Select the role for this team member
          </p>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Personal Message (Optional)
          </label>
          <textarea
            id="message"
            placeholder="Add a personal message to the invitation..."
            value={formData.message}
            onChange={(e) => handleInputChange("message", e.target.value)}
            rows={3}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.message ? "border-red-300" : "border-gray-300"
              }`}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            This message will be included in the invitation email
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamInviteForm;
