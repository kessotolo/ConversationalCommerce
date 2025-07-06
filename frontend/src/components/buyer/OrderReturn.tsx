import React, { useState } from "react";
import { AlertCircle, Package, ArrowLeft } from "lucide-react";

// Mock services - replace with actual imports when available
const getOrderById = async (id: string) => ({
  id,
  order_number: "12345",
  status: "delivered",
  is_returned: false,
  order_items: []
});
const returnOrder = async (data: any) => data;

interface OrderItem {
  id: string;
  product_name: string;
  product_image_url?: string;
  price: number;
  quantity: number;
  options?: Record<string, string>;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  is_returned: boolean;
  order_items: OrderItem[];
}

interface ReturnRequest {
  order_id: string;
  reason: string;
  items: Array<{
    order_item_id: string;
    quantity: number;
    reason?: string;
  }>;
  additional_details: string;
}

interface ReturnItem extends OrderItem {
  isSelected: boolean;
  returnQuantity: number;
  returnReason?: string;
}

const OrderReturn: React.FC = () => {
  const orderId = "mock-order-id"; // Replace with useParams when available
  const navigate = (path: string) => console.log(`Navigate to: ${path}`); // Replace with useNavigate

  const [returnReason, setReturnReason] = useState<string>("defective");
  const [returnDetails, setReturnDetails] = useState<string>("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock order data
  const order: Order = {
    id: orderId,
    order_number: "12345",
    status: "delivered",
    is_returned: false,
    order_items: [
      {
        id: "item1",
        product_name: "Sample Product",
        price: 29.99,
        quantity: 2,
        product_image_url: "https://via.placeholder.com/100",
        options: { size: "M", color: "Blue" }
      }
    ]
  };

  // Initialize return items
  React.useEffect(() => {
    if (order) {
      setReturnItems(
        order.order_items.map((item: OrderItem) => ({
          ...item,
          isSelected: false,
          returnQuantity: 1,
          returnReason: "",
        }))
      );
    }
  }, [order]);

  const handleReturnSubmit = async () => {
    const selectedItems = returnItems.filter((item) => item.isSelected);

    if (selectedItems.length === 0) {
      alert("Please select at least one item to return");
      return;
    }

    try {
      setIsLoading(true);
      await returnOrder({
        order_id: orderId,
        reason: returnReason,
        items: selectedItems.map((item) => ({
          order_item_id: item.id,
          quantity: item.returnQuantity,
          reason: item.returnReason,
        })),
        additional_details: returnDetails,
      });

      alert("Return request submitted successfully!");
      navigate(`/orders/${orderId}`);
    } catch (err) {
      setError("Failed to submit return request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSelect = (itemId: string, isSelected: boolean) => {
    setReturnItems(
      returnItems.map((item) =>
        item.id === itemId ? { ...item, isSelected } : item
      )
    );
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setReturnItems(
      returnItems.map((item) =>
        item.id === itemId ? { ...item, returnQuantity: quantity } : item
      )
    );
  };

  const handleItemReasonChange = (itemId: string, reason: string) => {
    setReturnItems(
      returnItems.map((item) =>
        item.id === itemId ? { ...item, returnReason: reason } : item
      )
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-red-800">Error loading order details: {error}</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-red-800">Order not found</span>
      </div>
    );
  }

  // Check if order is eligible for return
  if (order.status !== "delivered" || order.is_returned) {
    return (
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <span className="text-yellow-800">
          This order is not eligible for return. Only delivered orders that haven't been returned can be returned.
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="mb-2 md:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">
            Return Items from Order #{order.order_number}
          </h1>
          <p className="text-gray-600 mt-1">
            Please select the items you wish to return
          </p>
        </div>
        <button
          onClick={() => navigate(`/orders/${orderId}`)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <span className="text-blue-800">
          Returns must be initiated within 30 days of delivery. Please make sure items are unused and in original packaging.
        </span>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>

        <div className="space-y-4 mb-6">
          {returnItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 border rounded-lg ${item.isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                }`}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={item.isSelected}
                    onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                {item.product_image_url && (
                  <div className="w-24 h-24 flex-shrink-0">
                    <img
                      src={item.product_image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/100";
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 mb-1 md:mb-0">
                      {item.product_name}
                    </h3>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(item.price)}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-2">
                    Original quantity: {item.quantity}
                  </p>

                  {item.options && Object.keys(item.options).length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600 mb-1">Options:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(item.options).map(([key, value]) => (
                          <span key={key} className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.isSelected && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor={`quantity-${item.id}`} className="block text-sm font-medium text-gray-700">
                          Return Quantity
                        </label>
                        <input
                          id={`quantity-${item.id}`}
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={item.returnQuantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor={`reason-${item.id}`} className="block text-sm font-medium text-gray-700">
                          Return Reason
                        </label>
                        <select
                          id={`reason-${item.id}`}
                          value={item.returnReason}
                          onChange={(e) => handleItemReasonChange(item.id, e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select return reason</option>
                          <option value="defective">Defective/Not working properly</option>
                          <option value="damage">Damaged upon arrival</option>
                          <option value="not_as_described">Not as described</option>
                          <option value="wrong_item">Wrong item received</option>
                          <option value="size_issue">Size/Fit issue</option>
                          <option value="changed_mind">Changed my mind</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 p-4 border rounded-lg bg-white">
          <h3 className="text-lg font-semibold mb-4">Return Details</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="primary-reason" className="block text-sm font-medium text-gray-700">
                Primary Return Reason
              </label>
              <select
                id="primary-reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="defective">Defective/Not working properly</option>
                <option value="damage">Damaged upon arrival</option>
                <option value="not_as_described">Not as described</option>
                <option value="wrong_item">Wrong item received</option>
                <option value="size_issue">Size/Fit issue</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="return-details" className="block text-sm font-medium text-gray-700">
                Additional Details
              </label>
              <textarea
                id="return-details"
                value={returnDetails}
                onChange={(e) => setReturnDetails(e.target.value)}
                placeholder="Please provide any additional information about your return..."
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate(`/orders/${orderId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReturnSubmit}
            disabled={!returnItems.some(item => item.isSelected) || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <Package className="h-4 w-4" />
            Submit Return Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderReturn;
