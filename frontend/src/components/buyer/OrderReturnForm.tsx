import React, { useState } from "react";
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
  Text,
  useToast,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";
import { createReturnRequest } from "../../services/orderService";

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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReturnFormData>();

  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedItems, setSelectedItems] = useState<Array<{id: string, name: string, quantity: number}>>([]);

  // Get order items from the order query cache
  const orderData = queryClient.getQueryData(['order', orderId]);
  const orderItems = orderData?.items || [];

  const returnMutation = useMutation(createReturnRequest, {
    onSuccess: () => {
      toast({
        title: "Return request submitted",
        description: "We'll review your request and get back to you soon",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      queryClient.invalidateQueries(['order', orderId]);
      queryClient.invalidateQueries(['returns']);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to submit return request",
        description: error instanceof Error ? error.message : "Please try again later",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const onSubmit = async (data: ReturnFormData) => {
    // Only include selected items
    const returnItems = selectedItems.map(item => ({
      item_id: item.id,
      quantity: item.quantity,
    }));

    if (returnItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to return",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    await returnMutation.mutateAsync({
      order_id: orderId,
      return_reason: data.reason,
      return_details: data.details,
      items: returnItems,
    });
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

  return (
    <Box p={4} borderRadius="md" boxShadow="sm" bg="white">
      <Heading size="md" mb={4}>
        Return Request
      </Heading>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          <Box>
            <Heading size="sm" mb={2}>
              Select items to return
            </Heading>
            {orderItems.length > 0 ? (
              <Box borderWidth="1px" borderRadius="md" p={2}>
                {orderItems.map((item: any) => (
                  <Box
                    key={item.id}
                    p={2}
                    borderWidth="1px"
                    borderRadius="md"
                    mb={2}
                    bg={selectedItems.some(i => i.id === item.id) ? "gray.100" : "white"}
                    cursor="pointer"
                    onClick={() => toggleItemSelection(item)}
                  >
                    <Text fontWeight="bold">{item.name}</Text>
                    <Text fontSize="sm">Quantity: {item.quantity}</Text>
                    {selectedItems.some(i => i.id === item.id) && (
                      <Text fontSize="sm" color="green.500">
                        Selected for return
                      </Text>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Text>No items available for return</Text>
            )}
          </Box>

          <FormControl isRequired isInvalid={!!errors.reason}>
            <FormLabel>Return Reason</FormLabel>
            <Select placeholder="Select reason" {...register("reason", { required: true })}>
              {RETURN_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.split("_").map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(" ")}
                </option>
              ))}
            </Select>
            <FormHelperText>
              Please select the reason for your return
            </FormHelperText>
          </FormControl>

          <FormControl isInvalid={!!errors.details}>
            <FormLabel>Additional Details</FormLabel>
            <Textarea
              placeholder="Please provide any additional details about your return"
              {...register("details")}
            />
            <FormHelperText>
              The more information you provide, the faster we can process your return
            </FormHelperText>
          </FormControl>

          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              type="submit"
              isLoading={isSubmitting || returnMutation.isLoading}
              loadingText="Submitting"
            >
              Submit Return Request
            </Button>
          </Box>
        </VStack>
      </form>
    </Box>
  );
};

export default OrderReturnForm;
