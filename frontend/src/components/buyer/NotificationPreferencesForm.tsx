import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Switch } from "@/components/ui/Switch";
import type {
  NotificationPreferences,
  NotificationConfig,
} from "../../services/notificationService";

const NotificationPreferencesForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Mock preferences data for now
  const preferences: NotificationPreferences = {
    user_id: "user-1",
    tenant_id: "tenant-1",
    account_updates: {
      enabled: true,
      channels: {
        email: true,
        sms: false,
        push: true,
        in_app: true,
      },
    },
    order_updates: {
      enabled: true,
      channels: {
        email: true,
        sms: true,
        push: true,
        in_app: true,
      },
    },
    marketing: {
      enabled: false,
      channels: {
        email: false,
        sms: false,
        push: false,
        in_app: false,
      },
    },
    security: {
      enabled: true,
      channels: {
        email: true,
        sms: true,
        push: false,
        in_app: true,
      },
    },
    seller_verification: {
      enabled: true,
      channels: {
        email: true,
        sms: false,
        push: true,
        in_app: true,
      },
    },
    team_invitations: {
      enabled: true,
      channels: {
        email: true,
        sms: false,
        push: true,
        in_app: true,
      },
    },
  };

  const handleToggleCategory = (
    category: keyof Omit<NotificationPreferences, "user_id" | "tenant_id">,
    enabled: boolean
  ) => {
    console.log(`Toggling ${category} to ${enabled}`);
    // In a real app, you'd update the preferences here
  };

  const handleToggleChannel = (
    category: keyof Omit<NotificationPreferences, "user_id" | "tenant_id">,
    channel: keyof NotificationConfig["channels"],
    enabled: boolean
  ) => {
    console.log(`Toggling ${category}.${channel} to ${enabled}`);
    // In a real app, you'd update the preferences here
  };

  const saveAllPreferences = async () => {
    setIsLoading(true);
    try {
      // In a real app, you'd save the preferences here
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <p className="text-gray-600">
          Choose which notifications you'd like to receive and how you want to
          receive them.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Updates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Account Updates</h3>
              <button
                onClick={() => handleToggleCategory("account_updates", !preferences.account_updates.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${preferences.account_updates.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${preferences.account_updates.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Profile changes, password resets, and security alerts
            </p>
            <hr className="mb-3" />
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.account_updates.channels.email}
                  onChange={(e) =>
                    handleToggleChannel(
                      "account_updates",
                      "email",
                      e.target.checked
                    )
                  }
                  disabled={!preferences.account_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.account_updates.enabled ? "text-gray-400" : ""}>
                  Email
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.account_updates.channels.sms}
                  onChange={(e) =>
                    handleToggleChannel("account_updates", "sms", e.target.checked)
                  }
                  disabled={!preferences.account_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.account_updates.enabled ? "text-gray-400" : ""}>
                  SMS
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.account_updates.channels.push}
                  onChange={(e) =>
                    handleToggleChannel(
                      "account_updates",
                      "push",
                      e.target.checked
                    )
                  }
                  disabled={!preferences.account_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.account_updates.enabled ? "text-gray-400" : ""}>
                  Push Notifications
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.account_updates.channels.in_app}
                  onChange={(e) =>
                    handleToggleChannel(
                      "account_updates",
                      "in_app",
                      e.target.checked
                    )
                  }
                  disabled={!preferences.account_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.account_updates.enabled ? "text-gray-400" : ""}>
                  In-App
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Order Updates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Order Updates</h3>
              <button
                onClick={() => handleToggleCategory("order_updates", !preferences.order_updates.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${preferences.order_updates.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${preferences.order_updates.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Order confirmations, shipping updates, and delivery notifications
            </p>
            <hr className="mb-3" />
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.order_updates.channels.email}
                  onChange={(e) =>
                    handleToggleChannel("order_updates", "email", e.target.checked)
                  }
                  disabled={!preferences.order_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.order_updates.enabled ? "text-gray-400" : ""}>
                  Email
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.order_updates.channels.sms}
                  onChange={(e) =>
                    handleToggleChannel("order_updates", "sms", e.target.checked)
                  }
                  disabled={!preferences.order_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.order_updates.enabled ? "text-gray-400" : ""}>
                  SMS
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.order_updates.channels.push}
                  onChange={(e) =>
                    handleToggleChannel("order_updates", "push", e.target.checked)
                  }
                  disabled={!preferences.order_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.order_updates.enabled ? "text-gray-400" : ""}>
                  Push Notifications
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.order_updates.channels.in_app}
                  onChange={(e) =>
                    handleToggleChannel(
                      "order_updates",
                      "in_app",
                      e.target.checked
                    )
                  }
                  disabled={!preferences.order_updates.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.order_updates.enabled ? "text-gray-400" : ""}>
                  In-App
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Marketing */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Marketing</h3>
              <button
                onClick={() => handleToggleCategory("marketing", !preferences.marketing.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${preferences.marketing.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${preferences.marketing.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Promotions, new product announcements, and personalized recommendations
            </p>
            <hr className="mb-3" />
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.marketing.channels.email}
                  onChange={(e) =>
                    handleToggleChannel("marketing", "email", e.target.checked)
                  }
                  disabled={!preferences.marketing.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.marketing.enabled ? "text-gray-400" : ""}>
                  Email
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.marketing.channels.sms}
                  onChange={(e) =>
                    handleToggleChannel("marketing", "sms", e.target.checked)
                  }
                  disabled={!preferences.marketing.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.marketing.enabled ? "text-gray-400" : ""}>
                  SMS
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.marketing.channels.push}
                  onChange={(e) =>
                    handleToggleChannel("marketing", "push", e.target.checked)
                  }
                  disabled={!preferences.marketing.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.marketing.enabled ? "text-gray-400" : ""}>
                  Push Notifications
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.marketing.channels.in_app}
                  onChange={(e) =>
                    handleToggleChannel("marketing", "in_app", e.target.checked)
                  }
                  disabled={!preferences.marketing.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={!preferences.marketing.enabled ? "text-gray-400" : ""}>
                  In-App
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Security</h3>
              <button
                disabled={true}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${preferences.security.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  } opacity-50 cursor-not-allowed`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${preferences.security.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Login attempts, password changes, and security alerts (required)
            </p>
            <hr className="mb-3" />
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.security.channels.email}
                  onChange={(e) =>
                    handleToggleChannel("security", "email", e.target.checked)
                  }
                  disabled={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-400">Email (required)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.security.channels.sms}
                  onChange={(e) =>
                    handleToggleChannel("security", "sms", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>SMS</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.security.channels.push}
                  onChange={(e) =>
                    handleToggleChannel("security", "push", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Push Notifications</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.security.channels.in_app}
                  onChange={(e) =>
                    handleToggleChannel("security", "in_app", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>In-App</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={saveAllPreferences}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? "Saving..." : "Save All Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesForm;
