import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
  Divider,
  Image,
  Alert,
  AlertIcon,
  Spinner,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Textarea,
  Select,
  OrderedList,
  ListItem,
  useToast,
} from "@chakra-ui/react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { 
  getOrderById, 
  getOrderTracking, 
  cancelOrder, 
  Order, 
  CancellationRequest 
} from "../../services/orderService";

// Helper function to get badge color based on order status
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "pending":
      return "yellow";
    case "processing":
      return "blue";
    case "shipped":
      return "purple";
    case "delivered":
      return "green";
    case "cancelled":
      return "red";
    case "returned":
      return "orange";
    default:
      return "gray";
  }
};

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [cancellationReason, setCancellationReason] = useState<string>("changed_mind");
  const [cancellationDetails, setCancellationDetails] = useState<string>("");

  const { data: order, isLoading, error } = useQuery<Order>(
    ["order", orderId],
    () => getOrderById(orderId || ""),
    {
      enabled: !!orderId,
    }
  );

  const { data: tracking, isLoading: trackingLoading } = useQuery(
    ["orderTracking", orderId],
    () => getOrderTracking(orderId || ""),
    {
      enabled: !!orderId && order?.status === "shipped",
    }
  );

  const cancelMutation = useMutation(
    (data: CancellationRequest) => cancelOrder(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["order", orderId]);
        toast({
          title: "Order cancelled",
          description: "Your order has been successfully cancelled.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onClose();
      },
      onError: (error: any) => {
        toast({
          title: "Error cancelling order",
          description: error.message || "An unknown error occurred",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const handleCancelOrder = () => {
    if (orderId) {
      cancelMutation.mutate({
        order_id: orderId,
        reason: cancellationReason,
        additional_details: cancellationDetails,
      });
    }
  };

  const handleReturnOrder = () => {
    if (orderId) {
      navigate(`/orders/${orderId}/return`);
    }
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

  return (
    <Box p={4}>
      <Flex 
        direction={{ base: "column", md: "row" }} 
        justify="space-between" 
        align={{ base: "flex-start", md: "center" }}
        mb={6}
      >
        <Box mb={{ base: 2, md: 0 }}>
          <Heading size="lg">Order #{order.order_number}</Heading>
          <Text color="gray.600">
            Placed on {format(new Date(order.created_at), "MMMM dd, yyyy")}
          </Text>
        </Box>

        <HStack>
          <Badge colorScheme={getStatusColor(order.status)} fontSize="md" py={1} px={2}>
            {order.status}
          </Badge>
          {order.is_cancelled && (
            <Text color="red.500" fontWeight="medium">Cancelled</Text>
          )}
          {order.is_returned && (
            <Text color="orange.500" fontWeight="medium">Returned</Text>
          )}
        </HStack>
      </Flex>

      {(order.status !== "cancelled" && order.status !== "delivered" && order.status !== "returned") && (
        <Box mb={6}>
          <Button colorScheme="red" variant="outline" onClick={onOpen}>
            Cancel Order
          </Button>
        </Box>
      )}

      {(order.status === "delivered" && !order.is_returned) && (
        <Box mb={6}>
          <Button colorScheme="orange" variant="outline" onClick={handleReturnOrder}>
            Return Items
          </Button>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} mb={8}>
        <Box p={4} borderWidth="1px" borderRadius="md">
          <Heading size="sm" mb={3}>Shipping Info</Heading>
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">{order.shipping_address.recipient_name}</Text>
            <Text>{order.shipping_address.street_address_1}</Text>
            {order.shipping_address.street_address_2 && (
              <Text>{order.shipping_address.street_address_2}</Text>
            )}
            <Text>
              {order.shipping_address.city}, {order.shipping_address.state}{" "}
              {order.shipping_address.postal_code}
            </Text>
            <Text>{order.shipping_address.country}</Text>
            {order.shipping_address.phone && (
              <Text>Phone: {order.shipping_address.phone}</Text>
            )}
          </VStack>
        </Box>

        <Box p={4} borderWidth="1px" borderRadius="md">
          <Heading size="sm" mb={3}>Payment Method</Heading>
          <VStack align="start" spacing={1}>
            <Text>{order.payment_method}</Text>
            {order.payment_id && (
              <Text fontSize="sm" color="gray.600">
                Payment ID: {order.payment_id}
              </Text>
            )}
            {order.billing_address && (
              <>
                <Divider my={2} />
                <Text fontWeight="bold">Billing Address:</Text>
                <Text>{order.billing_address.recipient_name}</Text>
                <Text>{order.billing_address.street_address_1}</Text>
                {order.billing_address.street_address_2 && (
                  <Text>{order.billing_address.street_address_2}</Text>
                )}
                <Text>
                  {order.billing_address.city}, {order.billing_address.state}{" "}
                  {order.billing_address.postal_code}
                </Text>
              </>
            )}
          </VStack>
        </Box>

        <Box p={4} borderWidth="1px" borderRadius="md">
          <Heading size="sm" mb={3}>Order Summary</Heading>
          <VStack align="start" spacing={1} width="100%">
            <Flex justify="space-between" width="100%">
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(order.subtotal)}</Text>
            </Flex>
            <Flex justify="space-between" width="100%">
              <Text>Shipping:</Text>
              <Text>{formatCurrency(order.shipping_cost)}</Text>
            </Flex>
            <Flex justify="space-between" width="100%">
              <Text>Tax:</Text>
              <Text>{formatCurrency(order.tax)}</Text>
            </Flex>
            <Divider my={2} />
            <Flex justify="space-between" width="100%" fontWeight="bold">
              <Text>Total:</Text>
              <Text>{formatCurrency(order.total)}</Text>
            </Flex>
          </VStack>
        </Box>
      </SimpleGrid>

      {order.status === "shipped" && (
        <Box mb={8} p={4} borderWidth="1px" borderRadius="md">
          <Heading size="sm" mb={3}>Shipping Information</Heading>
          <VStack align="start" spacing={2}>
            {order.carrier && (
              <Text>
                <strong>Carrier:</strong> {order.carrier}
              </Text>
            )}
            {order.tracking_number && (
              <Text>
                <strong>Tracking Number:</strong> {order.tracking_number}
              </Text>
            )}
            {order.estimated_delivery_date && (
              <Text>
                <strong>Estimated Delivery:</strong>{" "}
                {format(new Date(order.estimated_delivery_date), "MMM dd, yyyy")}
              </Text>
            )}

            {trackingLoading ? (
              <Spinner size="sm" />
            ) : tracking ? (
              <Box width="100%" mt={2}>
                <Text fontWeight="medium" mb={2}>Tracking History:</Text>
                <OrderedList pl={4}>
                  {tracking.tracking_history.map((event, index) => (
                    <ListItem key={index} mb={1}>
                      <Text fontSize="sm">
                        {format(new Date(event.timestamp), "MMM dd, yyyy h:mm a")} -{" "}
                        {event.status}
                        {event.location ? ` (${event.location})` : ""}
                      </Text>
                    </ListItem>
                  ))}
                </OrderedList>
              </Box>
            ) : null}
          </VStack>
        </Box>
      )}

      <Heading size="md" mb={4}>
        Order Items ({order.order_items.reduce((sum, item) => sum + item.quantity, 0)})
      </Heading>

      <VStack spacing={4} align="stretch" mb={8}>
        {order.order_items.map((item) => (
          <Box
            key={item.id}
            p={4}
            borderWidth="1px"
            borderRadius="md"
          >
            <Flex direction={{ base: "column", sm: "row" }} gap={4}>
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
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </Flex>

                <Text mb={2}>
                  Qty: {item.quantity} x {formatCurrency(item.price)}
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

                {item.is_returned && (
                  <Badge colorScheme="orange">
                    Returned: {item.returned_quantity || item.quantity} item(s)
                  </Badge>
                )}
              </Box>
            </Flex>
          </Box>
        ))}
      </VStack>

      {order.notes && (
        <Box mb={8} p={4} borderWidth="1px" borderRadius="md">
          <Heading size="sm" mb={2}>Order Notes</Heading>
          <Text>{order.notes}</Text>
        </Box>
      )}

      {/* Cancellation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cancel Order</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </Text>

            <FormControl mb={4}>
              <FormLabel>Cancellation Reason</FormLabel>
              <Select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              >
                <option value="changed_mind">Changed my mind</option>
                <option value="found_better_price">Found better price elsewhere</option>
                <option value="ordered_by_mistake">Ordered by mistake</option>
                <option value="shipping_takes_too_long">Shipping takes too long</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Additional Details (Optional)</FormLabel>
              <Textarea
                value={cancellationDetails}
                onChange={(e) => setCancellationDetails(e.target.value)}
                placeholder="Please provide any additional information about your cancellation..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="red" 
              mr={3} 
              onClick={handleCancelOrder}
              isLoading={cancelMutation.isLoading}
            >
              Confirm Cancellation
            </Button>
            <Button variant="outline" onClick={onClose}>
              Never Mind
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default OrderDetail;
