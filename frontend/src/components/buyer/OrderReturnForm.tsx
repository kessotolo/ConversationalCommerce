import React, { useState } from "react";
import { AlertCircle, Package } from "lucide-react";

// Mock services - replace with actual imports when available
const createReturnRequest = async (data: any) => data;

interface OrderReturnFormProps {
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ReturnFormData {
  reason: string;
  details: string;
  items: Array<{
    id: string;
    quantity: number;
  }>;
}

const RETURN_REASONS = [
  "defective_product",
  "wrong_item",
  "damaged_during_shipping",
  "arrived_late",
  "changed_mind",
  "not_as_described",
  "other",
];

const OrderReturnForm: React.FC<OrderReturnFormProps> = ({
  orderId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ReturnFormData>({
    reason: "",
    details: "",
    items: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Array<{ id: string, name: string, quantity: number }>>([]);

  // Mock order items
  const orderItems = [
    { id: "item1", name: "Sample Product 1", quantity: 2 },
    { id: "item2", name: "Sample Product 2", quantity: 1 },
  ];

  const showToast = (title: string, description: string, type: "success" | "error" | "warning" = "success") => {
    // Simple alert for now - replace with actual toast when available
    alert(`${title}: ${description}`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.reason) {
      newErrors.reason = "Return reason is required";
    }

    // Only include selected items
    const returnItems = selectedItems.map(item => ({
      item_id: item.id,
      quantity: item.quantity,
    }));

    if (returnItems.length === 0) {
      showToast(
        "No items selected",
        "Please select at least one item to return",
        "warning"
      );
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await createReturnRequest({
        order_id: orderId,
        return_reason: formData.reason,
        return_details: formData.details,
        items: returnItems,
      });

      showToast(
        "Return request submitted",
        "We'll review your request and get back to you soon",
        "success"
      );

      if (onSuccess) onSuccess();
    } catch (error) {
      showToast(
        "Failed to submit return request",
        error instanceof Error ? error.message : "Please try again later",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleItemSelection = (item: any) => {
    if (selectedItems.some(i => i.id === item.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, {
        id: item.id,
        name: item.name,
        quantity: item.quantity
      }]);
    }
  };

  const handleInputChange = (field: keyof ReturnFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="p-4 rounded-md shadow-sm bg-white border">
      <h2 className="text-lg font-semibold mb-4">Return Request</h2>

      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Select items to return</h3>
            {orderItems.length > 0 ? (
              <div className="border rounded-md p-2">
                {orderItems.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-2 border rounded-md mb-2 cursor-pointer ${selectedItems.some(i => i.id === item.id) ? "bg-gray-100" : "bg-white"
                      }`}
                    onClick={() => toggleItemSelection(item)}
                  >
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm">Quantity: {item.quantity}</p>
                    {selectedItems.some(i => i.id === item.id) && (
                      <p className="text-sm text-green-600">Selected for return</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No items available for return</p>
            )}
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Return Reason <span className="text-red-500">*</span>
            </label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.reason ? "border-red-300" : "border-gray-300"
                }`}
            >
              <option value="">Select reason</option>
              {RETURN_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.split("_").map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(" ")}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Please select the reason for your return
            </p>
          </div>

          <div>
            <label htmlFor="details" className="block text-sm font-medium text-gray-700">
              Additional Details
            </label>
            <textarea
              id="details"
              value={formData.details}
              onChange={(e) => handleInputChange("details", e.target.value)}
              placeholder="Please provide any additional details about your return"
              rows={4}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.details ? "border-red-300" : "border-gray-300"
                }`}
            />
            {errors.details && (
              <p className="mt-1 text-sm text-red-600">{errors.details}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              The more information you provide, the faster we can process your return
            </p>
          </div>

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <Package className="h-4 w-4" />
              {isSubmitting ? "Submitting" : "Submit Return Request"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderReturnForm;
