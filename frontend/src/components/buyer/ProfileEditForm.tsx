import React, { useState, useEffect } from "react";
import { Eye, EyeOff, User, Save } from "lucide-react";

// Mock services - replace with actual imports when available
const updateUserProfile = async (data: any) => data;
const getUserProfile = async () => ({
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890"
});

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
}

const ProfileEditForm: React.FC = () => {
  const [isPasswordChangeVisible, setIsPasswordChangeVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Mock profile loading
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile();
        setFormData({
          name: profile.name,
          email: profile.email,
          phone: profile.phone || "",
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const showToast = (title: string, type: "success" | "error" = "success") => {
    // Simple alert for now - replace with actual toast when available
    alert(`${title}`);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    // Phone validation (optional)
    if (formData.phone && !/^\+?[0-9]{10,15}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }

    // Password validation (if changing password)
    if (isPasswordChangeVisible) {
      if (!formData.current_password) {
        newErrors.current_password = "Current password is required";
      }

      if (!formData.new_password) {
        newErrors.new_password = "New password is required";
      } else if (formData.new_password.length < 8) {
        newErrors.new_password = "Password must be at least 8 characters";
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(formData.new_password)) {
        newErrors.new_password = "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character";
      }

      if (!formData.confirm_password) {
        newErrors.confirm_password = "Please confirm your new password";
      } else if (formData.new_password !== formData.confirm_password) {
        newErrors.confirm_password = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Only include password fields if the user is changing their password
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        ...(formData.current_password && formData.new_password
          ? {
            current_password: formData.current_password,
            new_password: formData.new_password,
          }
          : {}),
      };

      await updateUserProfile(payload);

      showToast("Profile updated", "success");

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
      setIsPasswordChangeVisible(false);
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordChangeForm = () => {
    setIsPasswordChangeVisible(!isPasswordChangeVisible);
    if (!isPasswordChangeVisible) {
      setFormData(prev => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
      // Clear password-related errors
      const newErrors = { ...errors };
      delete newErrors.current_password;
      delete newErrors.new_password;
      delete newErrors.confirm_password;
      setErrors(newErrors);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white w-full">
      <div className="space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit Profile
        </h2>

        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.name ? "border-red-300" : "border-gray-300"
                  }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.email ? "border-red-300" : "border-gray-300"
                  }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="Phone Number (optional)"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.phone ? "border-red-300" : "border-gray-300"
                  }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <hr className="my-4" />

            <div className="flex justify-between items-center">
              <span className="font-medium">Password</span>
              <button
                type="button"
                onClick={togglePasswordChangeForm}
                className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                {isPasswordChangeVisible ? "Cancel" : "Change Password"}
              </button>
            </div>

            {isPasswordChangeVisible && (
              <>
                <div>
                  <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="current_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Current Password"
                      value={formData.current_password}
                      onChange={(e) => handleInputChange("current_password", e.target.value)}
                      className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.current_password ? "border-red-300" : "border-gray-300"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.current_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="new_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      value={formData.new_password}
                      onChange={(e) => handleInputChange("new_password", e.target.value)}
                      className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.new_password ? "border-red-300" : "border-gray-300"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.new_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirm_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm New Password"
                      value={formData.confirm_password}
                      onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                      className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.confirm_password ? "border-red-300" : "border-gray-300"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
                  )}
                </div>
              </>
            )}

            <hr className="my-4" />

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditForm;
