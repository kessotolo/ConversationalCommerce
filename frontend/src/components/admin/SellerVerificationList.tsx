import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

interface VerificationListProps {
  onViewDetails: (verificationId: string) => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_review":
      return "bg-blue-100 text-blue-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "additional_info_needed":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case "identity":
      return "bg-purple-100 text-purple-800";
    case "business":
      return "bg-cyan-100 text-cyan-800";
    case "banking":
      return "bg-teal-100 text-teal-800";
    case "tax":
      return "bg-blue-100 text-blue-800";
    case "address":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const SellerVerificationList: React.FC<VerificationListProps> = ({ onViewDetails }) => {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Mock data for now
  const verifications = [
    {
      id: "ver-1",
      seller_id: "seller-123",
      verification_type: "business_license",
      status: "pending",
      submitted_at: "2024-01-15T10:30:00Z"
    },
    {
      id: "ver-2",
      seller_id: "seller-456",
      verification_type: "identity",
      status: "in_review",
      submitted_at: "2024-01-14T15:45:00Z"
    },
    {
      id: "ver-3",
      seller_id: "seller-789",
      verification_type: "banking",
      status: "approved",
      submitted_at: "2024-01-13T09:15:00Z"
    }
  ];

  const filteredVerifications = verifications.filter(verification => {
    const matchesStatus = !statusFilter || verification.status === statusFilter;
    const matchesType = !typeFilter || verification.verification_type === typeFilter;
    return matchesStatus && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex space-x-4">
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status Filter
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="additional_info_needed">Additional Info Needed</option>
          </select>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type Filter
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="identity">Identity</option>
            <option value="business_license">Business License</option>
            <option value="banking">Banking</option>
            <option value="tax">Tax</option>
            <option value="address">Address</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredVerifications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No verification requests match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVerifications.map((verification) => (
                <tr key={verification.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {verification.seller_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getTypeColor(verification.verification_type)}>
                      {verification.verification_type.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(verification.status)}>
                      {verification.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(verification.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      size="sm"
                      onClick={() => onViewDetails(verification.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Review
                    </Button>
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

export default SellerVerificationList;
