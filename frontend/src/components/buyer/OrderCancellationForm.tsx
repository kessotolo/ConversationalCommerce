import React from "react";
import {
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  Select,
  VStack,
  Box,
  Heading,
  useToast,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CancellationFormData>();

  const toast = useToast();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation(cancelOrder, {
    onSuccess: () => {
      toast({
        title: "Order cancelled successfully",
        description: "Your cancellation request has been processed",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      queryClient.invalidateQueries(['order', orderId]);
      queryClient.invalidateQueries(['orders']);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel order",
        description: error instanceof Error ? error.message : "Please try again later",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const onSubmit = async (data: CancellationFormData) => {
    await cancelMutation.mutateAsync({
      order_id: orderId,
      cancellation_reason: data.reason,
      cancellation_details: data.details,
    });
  };

  return (
    <Box p={4} borderRadius="md" boxShadow="sm" bg="white">
      <Heading size="md" mb={4}>
        Cancel Order
      </Heading>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired isInvalid={!!errors.reason}>
            <FormLabel>Cancellation Reason</FormLabel>
            <Select placeholder="Select reason" {...register("reason", { required: true })}>
              {CANCELLATION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.split("_").map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(" ")}
                </option>
              ))}
            </Select>
            <FormHelperText>
              Please select the reason for cancelling your order
            </FormHelperText>
          </FormControl>

          <FormControl isInvalid={!!errors.details}>
            <FormLabel>Additional Details</FormLabel>
            <Textarea
              placeholder="Please provide any additional details about your cancellation"
              {...register("details")}
            />
            <FormHelperText>
              Any additional information that might help us improve our service
            </FormHelperText>
          </FormControl>

          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button variant="outline" onClick={onCancel}>
              Back to Order
            </Button>
            <Button 
              colorScheme="red" 
              type="submit"
              isLoading={isSubmitting || cancelMutation.isLoading}
              loadingText="Cancelling"
            >
              Cancel Order
            </Button>
          </Box>
        </VStack>
      </form>
    </Box>
  );
};

export default OrderCancellationForm;
