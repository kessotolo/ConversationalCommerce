import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VerificationDetailProps {
  verificationId: string;
  onClose: () => void;
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

const SellerVerificationDetail: React.FC<VerificationDetailProps> = ({
  verificationId,
  onClose,
}) => {
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock verification data for now
  const verification = {
    id: verificationId,
    verification_type: "business_license",
    status: "pending",
    seller_id: "seller-123",
    business_name: "Sample Business",
    submitted_at: "2024-01-15T10:30:00Z",
    documents: [
      {
        id: "doc-1",
        type: "business_license",
        url: "/placeholder-document.pdf",
        filename: "business_license.pdf"
      }
    ]
  };

  const handleApprove = async () => {
    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  const handleReject = async () => {
    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  const handleRequestInfo = async () => {
    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Verification Detail ({verification.verification_type.replace(/_/g, " ")})
        </h2>
        <Badge className={getStatusColor(verification.status)}>
          {verification.status.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name</label>
            <p className="mt-1 text-sm text-gray-900">{verification.business_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Seller ID</label>
            <p className="mt-1 text-sm text-gray-900">{verification.seller_id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Submitted At</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(verification.submitted_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {verification.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{doc.type.replace(/_/g, " ")}</p>
                  <p className="text-sm text-gray-500">{doc.filename}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(doc.url, '_blank')}
                >
                  View Document
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this verification..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>

        {verification.status === "pending" && (
          <>
            <Button
              variant="outline"
              onClick={handleRequestInfo}
              disabled={isLoading}
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              Request More Info
            </Button>

            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isLoading}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Reject
            </Button>

            <Button
              onClick={handleApprove}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? "Processing..." : "Approve"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SellerVerificationDetail;
