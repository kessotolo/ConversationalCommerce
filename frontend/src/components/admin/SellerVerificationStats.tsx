import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  stat: number;
  helpText?: string;
  colorScheme?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  stat,
  helpText,
  colorScheme = "blue",
}) => {
  const getColorClasses = (scheme: string) => {
    switch (scheme) {
      case "yellow":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "blue":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "green":
        return "bg-green-50 border-green-200 text-green-800";
      case "red":
        return "bg-red-50 border-red-200 text-red-800";
      case "orange":
        return "bg-orange-50 border-orange-200 text-orange-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <Card className={`${getColorClasses(colorScheme)} shadow-sm`}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold">{stat}</p>
          {helpText && <p className="text-sm opacity-70">{helpText}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

const SellerVerificationStats: React.FC = () => {
  // Mock stats data for now
  const stats = {
    pending_verifications: 12,
    in_review_verifications: 8,
    approved_sellers: 156,
    rejected_verifications: 3,
    additional_info_needed: 5,
    pending_identity: 4,
    pending_business: 3,
    pending_banking: 2,
    pending_tax: 2,
    pending_address: 1,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seller Verification Dashboard</CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Pending Verifications"
          stat={stats.pending_verifications}
          colorScheme="yellow"
        />
        <StatCard
          title="In Review"
          stat={stats.in_review_verifications}
          colorScheme="blue"
        />
        <StatCard
          title="Approved Sellers"
          stat={stats.approved_sellers}
          colorScheme="green"
        />
        <StatCard
          title="Rejected"
          stat={stats.rejected_verifications}
          colorScheme="red"
        />
        <StatCard
          title="Additional Info Needed"
          stat={stats.additional_info_needed}
          colorScheme="orange"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-semibold">Pending by Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Identity" stat={stats.pending_identity} />
          <StatCard title="Business" stat={stats.pending_business} />
          <StatCard title="Banking" stat={stats.pending_banking} />
          <StatCard title="Tax" stat={stats.pending_tax} />
          <StatCard title="Address" stat={stats.pending_address} />
        </div>
      </div>
    </div>
  );
};

export default SellerVerificationStats;
