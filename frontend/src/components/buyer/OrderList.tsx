import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const OrderList: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "shipped", label: "Shipped" },
    { id: "delivered", label: "Delivered" },
  ];

  const mockOrders = [
    {
      id: "order-1",
      order_number: "ORD-12345",
      status: "shipped",
      total: 89.99,
      created_at: "2024-01-15T10:30:00Z",
      items_count: 3,
    },
    {
      id: "order-2",
      order_number: "ORD-12344",
      status: "delivered",
      total: 156.50,
      created_at: "2024-01-10T14:20:00Z",
      items_count: 2,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Orders</h1>
      </div>

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

          {/* Orders Content */}
          <div className="p-6">
            <div className="space-y-4">
              {mockOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold">Order {order.order_number}</h3>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {order.items_count} items • ${order.total.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Placed on {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        {order.status === "delivered" && (
                          <Button variant="outline" size="sm">
                            Return Items
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {mockOrders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Start Shopping
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600">Order list functionality is being migrated to the new UI system.</p>
              <p className="text-sm text-gray-500 mt-1">This component will be fully implemented with shadcn/ui components.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderList;
