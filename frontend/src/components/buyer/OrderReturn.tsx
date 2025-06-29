import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Image,
  Alert,
  AlertIcon,
  Spinner,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Checkbox,
  useToast,
} from "@chakra-ui/react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";
import { getOrderById, returnOrder, Order, ReturnRequest, OrderItem } from "../../services/orderService";

interface ReturnItem extends OrderItem {
  isSelected: boolean;
  returnQuantity: number;
  returnReason?: string;
}

const OrderReturn: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [returnReason, setReturnReason] = useState<string>("defective");
  const [returnDetails, setReturnDetails] = useState<string>("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const { data: order, isLoading, error } = useQuery<Order>(
    ["order", orderId],
    () => getOrderById(orderId || ""),
    {
      enabled: !!orderId,
      onSuccess: (data) => {
        // Initialize return items
        setReturnItems(
          data.order_items.map((item) => ({
            ...item,
            isSelected: false,
            returnQuantity: 1,
            returnReason: "",
          }))
        );
      },
    }
  );

  const returnMutation = useMutation(
    (data: ReturnRequest) => returnOrder(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["order", orderId]);
        toast({
          title: "Return request submitted",
          description: "Your return request has been successfully submitted.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        navigate(`/orders/${orderId}`);
      },
      onError: (error: any) => {
        toast({
          title: "Error submitting return",
          description: error.message || "An unknown error occurred",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const handleReturnSubmit = () => {
    const selectedItems = returnItems.filter((item) => item.isSelected);
    
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to return",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (orderId) {
      returnMutation.mutate({
        order_id: orderId,
        reason: returnReason,
        items: selectedItems.map((item) => ({
          order_item_id: item.id,
          quantity: item.returnQuantity,
          reason: item.returnReason,
        })),
        additional_details: returnDetails,
      });
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
      <Flex justify="center" align="center" height="300px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert status="error" mb={4}>
        <AlertIcon />
        Error loading order details: {(error as Error).message}
      </Alert>
    );
  }

  if (!order) {
    return (
      <Alert status="error" mb={4}>
        <AlertIcon />
        Order not found
      </Alert>
    );
  }

  // Check if order is eligible for return
  if (order.status !== "delivered" || order.is_returned) {
    return (
      <Alert status="warning" mb={4}>
        <AlertIcon />
        This order is not eligible for return. Only delivered orders that haven't been returned can be returned.
      </Alert>
    );
  }

  return (
    <Box p={4}>
      <Flex 
        direction={{ base: "column", md: "row" }} 
        justify="space-between" 
        align={{ base: "flex-start", md: "center" }}
        mb={6}
      >
        <Box mb={{ base: 2, md: 0 }}>
          <Heading size="lg">Return Items from Order #{order.order_number}</Heading>
          <Text color="gray.600">
            Please select the items you wish to return
          </Text>
        </Box>
      </Flex>

      <Alert status="info" mb={6}>
        <AlertIcon />
        Returns must be initiated within 30 days of delivery. Please make sure items are unused and in original packaging.
      </Alert>

      <Box mb={8}>
        <Heading size="md" mb={4}>
          Order Items
        </Heading>

        <VStack spacing={4} align="stretch" mb={6}>
          {returnItems.map((item) => (
            <Box
              key={item.id}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              bg={item.isSelected ? "blue.50" : "white"}
            >
              <Flex direction={{ base: "column", sm: "row" }} gap={4}>
                <Checkbox 
                  isChecked={item.isSelected} 
                  onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                  alignSelf="flex-start"
                  size="lg"
                />

                {item.product_image_url && (
                  <Box minWidth="100px" maxWidth="100px" height="100px">
                    <Image
                      src={item.product_image_url}
                      alt={item.product_name}
                      objectFit="cover"
                      height="100%"
                      width="100%"
                      borderRadius="md"
                      fallbackSrc="https://via.placeholder.com/100"
                    />
                  </Box>
                )}

                <Box flex="1">
                  <Flex
                    justify="space-between"
                    direction={{ base: "column", md: "row" }}
                    mb={2}
                  >
                    <Heading size="sm" mb={{ base: 1, md: 0 }}>
                      {item.product_name}
                    </Heading>
                    <Text fontWeight="bold">
                      {formatCurrency(item.price)}
                    </Text>
                  </Flex>

                  <Text mb={2}>
                    Original quantity: {item.quantity}
                  </Text>

                  {item.options && Object.keys(item.options).length > 0 && (
                    <Box mb={2}>
                      <Text fontSize="sm" color="gray.600">
                        Options:
                      </Text>
                      <HStack flexWrap="wrap" spacing={2} mt={1}>
                        {Object.entries(item.options).map(([key, value]) => (
                          <Badge key={key} colorScheme="gray">
                            {key}: {value}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                  )}

                  {item.isSelected && (
                    <VStack align="start" spacing={3} mt={4}>
                      <FormControl>
                        <FormLabel>Return Quantity</FormLabel>
                        <NumberInput 
                          min={1} 
                          max={item.quantity} 
                          value={item.returnQuantity}
                          onChange={(_, val) => handleQuantityChange(item.id, val)}
                          width={{ base: "100%", md: "150px" }}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Return Reason</FormLabel>
                        <Select
                          value={item.returnReason}
                          onChange={(e) => handleItemReasonChange(item.id, e.target.value)}
                          placeholder="Select return reason"
                        >
                          <option value="defective">Defective/Not working properly</option>
                          <option value="damage">Damaged upon arrival</option>
                          <option value="not_as_described">Not as described</option>
                          <option value="wrong_item">Wrong item received</option>
                          <option value="size_issue">Size/Fit issue</option>
                          <option value="changed_mind">Changed my mind</option>
                          <option value="other">Other</option>
                        </Select>
                      </FormControl>
                    </VStack>
                  )}
                </Box>
              </Flex>
            </Box>
          ))}
        </VStack>

        <Box p={4} borderWidth="1px" borderRadius="md" mb={6}>
          <Heading size="sm" mb={4}>Return Details</Heading>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Primary Return Reason</FormLabel>
              <Select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              >
                <option value="defective">Defective/Not working properly</option>
                <option value="damage">Damaged upon arrival</option>
                <option value="not_as_described">Not as described</option>
                <option value="wrong_item">Wrong item received</option>
                <option value="size_issue">Size/Fit issue</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Additional Details</FormLabel>
              <Textarea
                value={returnDetails}
                onChange={(e) => setReturnDetails(e.target.value)}
                placeholder="Please provide any additional information about your return..."
                rows={4}
              />
            </FormControl>
          </VStack>
        </Box>

        <HStack spacing={4} justify="flex-end">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/orders/${orderId}`)}
          >
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleReturnSubmit}
            isLoading={returnMutation.isLoading}
            isDisabled={!returnItems.some(item => item.isSelected)}
          >
            Submit Return Request
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

export default OrderReturn;
