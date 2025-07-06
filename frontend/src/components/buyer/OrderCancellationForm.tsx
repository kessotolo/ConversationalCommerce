import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useForm } from "react-hook-form";
import { cancelOrder } from "../../services/orderService";

interface OrderCancellationFormProps {
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface CancellationFormData {
  reason: string;
  details: string;
}

const CANCELLATION_REASONS = [
  "changed_mind",
  "found_better_price",
  "shipping_too_slow",
  "ordered_by_mistake",
  "payment_issues",
  "other",
];

const OrderCancellationForm: React.FC<OrderCancellationFormProps> = ({
  orderId,
  onSuccess,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancellationFormData>();

  const onSubmit = async (data: CancellationFormData) => {
    setIsSubmitting(true);
    try {
      await cancelOrder({
        order_id: orderId,
        reason: data.reason,
        additional_details: data.details,
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancel Order</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cancellation Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Reason *
            </label>
            <select
              {...register("reason", { required: "Please select a reason" })}
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.reason ? "border-red-500" : ""
                }`}
            >
              <option value="">Select reason</option>
              {CANCELLATION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.split("_").map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(" ")}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Please select the reason for cancelling your order
            </p>
            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
            )}
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details
            </label>
            <textarea
              {...register("details")}
              placeholder="Please provide any additional details about your cancellation"
              rows={4}
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.details ? "border-red-500" : ""
                }`}
            />
            <p className="text-sm text-gray-500 mt-1">
              Any additional information that might help us improve our service
            </p>
            {errors.details && (
              <p className="text-red-500 text-sm mt-1">{errors.details.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              type="button"
            >
              Back to Order
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Cancelling..." : "Cancel Order"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default OrderCancellationForm;
