import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

// Import all our profile components
import ProfileEditForm from "./ProfileEditForm";
import NotificationPreferencesForm from "./NotificationPreferencesForm";
import AddressList from "./AddressList";
import PaymentMethodManagement from "./PaymentMethodManagement";

const BuyerProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profile", component: <ProfileEditForm /> },
    { id: "addresses", label: "Addresses", component: <AddressList /> },
    { id: "payment", label: "Payment Methods", component: <PaymentMethodManagement /> },
    { id: "notifications", label: "Notifications", component: <NotificationPreferencesForm /> },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <Card>
        <CardContent className="p-0">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "profile" && (
              <div className="max-w-2xl mx-auto">
                <ProfileEditForm />
              </div>
            )}

            {activeTab === "addresses" && (
              <AddressList />
            )}

            {activeTab === "payment" && (
              <PaymentMethodManagement />
            )}

            {activeTab === "notifications" && (
              <div className="max-w-2xl mx-auto">
                <NotificationPreferencesForm />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerProfile;
