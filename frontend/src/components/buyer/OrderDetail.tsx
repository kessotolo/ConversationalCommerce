import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const OrderDetail: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <p className="text-gray-600">Order details will be displayed here</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Order #12345</h3>
              <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
            </div>

            <div className="border-t pt-4">
              <p className="text-gray-600">Order details functionality is being migrated to the new UI system.</p>
              <p className="text-sm text-gray-500 mt-2">This component will be fully implemented with shadcn/ui components.</p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button variant="outline">
                Back to Orders
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                Cancel Order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetail;
