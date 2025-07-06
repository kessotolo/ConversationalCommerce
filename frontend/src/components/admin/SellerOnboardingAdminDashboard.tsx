import React, { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

// Import our modular components
import SellerVerificationStats from "./SellerVerificationStats";
import SellerVerificationList from "./SellerVerificationList";
import SellerVerificationDetail from "./SellerVerificationDetail";

const SellerOnboardingAdminDashboard: React.FC = () => {
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const handleViewVerificationDetails = (verificationId: string) => {
    setSelectedVerificationId(verificationId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVerificationId(null);
  };

  const tabs = [
    { id: "pending", label: "Pending", statusFilter: "pending" },
    { id: "review", label: "In Review", statusFilter: "in_review" },
    { id: "info-needed", label: "Info Needed", statusFilter: "additional_info_needed" },
    { id: "approved", label: "Approved", statusFilter: "approved" },
    { id: "rejected", label: "Rejected", statusFilter: "rejected" },
    { id: "all", label: "All", statusFilter: "" },
  ];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Seller Onboarding Administration
          </CardTitle>
        </CardHeader>
      </Card>

      <SellerVerificationStats />

      <Card>
        <CardContent className="p-6">
          {/* Custom Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
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
          <div className="mt-6">
            <SellerVerificationList
              onViewDetails={handleViewVerificationDetails}
            // statusFilter={tabs.find(tab => tab.id === activeTab)?.statusFilter}
            />
          </div>
        </CardContent>
      </Card>

      {/* Simple modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Verification Details</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              {selectedVerificationId && (
                <SellerVerificationDetail
                  verificationId={selectedVerificationId}
                  onClose={handleCloseModal}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerOnboardingAdminDashboard;
