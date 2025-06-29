import React, { useState } from "react";
import {
  Box,
  Text,
  Heading,
  Flex,
  Badge,
  SimpleGrid,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Spinner,
  Alert,
  AlertIcon,
  HStack,
  VStack,
  Divider,
  useBreakpointValue,
  Select,
  Pagination,
  PaginationContainer,
  PaginationPrevious,
  PaginationNext,
  PaginationPageGroup,
  PaginationPage,
  usePagination,
} from "@chakra-ui/react";
import { useQuery } from "react-query";
import { getUserOrders, OrderListResponse } from "../../services/orderService";
import { format } from "date-fns";
import { Link as RouterLink } from "react-router-dom";

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

const OrderList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date_desc");

  // Pagination state
  const { currentPage, setCurrentPage, pageSize, setPageSize } = usePagination({
    initialState: {
      currentPage: 1,
      pageSize: 10,
    },
  });

  const { data, isLoading, error, refetch } = useQuery<OrderListResponse>(
    ["userOrders", currentPage, pageSize, statusFilter, sortBy],
    () => getUserOrders(currentPage, pageSize, statusFilter),
    {
      keepPreviousData: true,
    }
  );

  const isDesktop = useBreakpointValue({ base: false, md: true });

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
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
        Error loading orders: {(error as Error).message}
      </Alert>
    );
  }

  return (
    <Box p={4}>
      <Heading size="lg" mb={6}>
        My Orders
      </Heading>

      <Tabs variant="soft-rounded" colorScheme="blue" onChange={(index) => {
        const statuses = ["", "pending", "processing", "shipped", "delivered", "cancelled"];
        handleStatusFilterChange(statuses[index]);
      }}>
        <TabList mb={4} overflowX="auto" py={2}>
          <Tab>All</Tab>
          <Tab>Pending</Tab>
          <Tab>Processing</Tab>
          <Tab>Shipped</Tab>
          <Tab>Delivered</Tab>
          <Tab>Cancelled</Tab>
        </TabList>

        <TabPanels>
          {["", "pending", "processing", "shipped", "delivered", "cancelled"].map(
            (status, index) => (
              <TabPanel key={index} p={0}>
                <Box mb={4}>
                  <Flex justifyContent="space-between" alignItems="center" mb={4}>
                    <Text fontWeight="medium">
                      {data?.total || 0} {status || "Total"} Orders
                    </Text>
                    <Select 
                      size="sm" 
                      width="auto" 
                      value={sortBy}
                      onChange={handleSortChange}
                    >
                      <option value="date_desc">Newest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="total_desc">Price: High to Low</option>
                      <option value="total_asc">Price: Low to High</option>
                    </Select>
                  </Flex>

                  {data?.orders.length === 0 ? (
                    <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg">
                      <Text>No orders found.</Text>
                    </Box>
                  ) : (
                    <VStack spacing={4}>
                      {data?.orders.map((order) => (
                        <Box
                          key={order.id}
                          w="100%"
                          p={4}
                          borderWidth="1px"
                          borderRadius="lg"
                          boxShadow="sm"
                        >
                          <Flex
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "flex-start", md: "center" }}
                            mb={3}
                          >
                            <HStack mb={{ base: 2, md: 0 }}>
                              <Text fontWeight="bold">Order #{order.order_number}</Text>
                              <Badge colorScheme={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </HStack>

                            <Text fontSize="sm" color="gray.500">
                              {format(new Date(order.created_at), "MMM dd, yyyy")}
                            </Text>
                          </Flex>

                          <Divider my={2} />

                          {isDesktop ? (
                            <SimpleGrid columns={3} spacing={4} mb={3}>
                              <Box>
                                <Text fontSize="sm" color="gray.600">
                                  Items
                                </Text>
                                <Text>
                                  {order.order_items.reduce(
                                    (sum, item) => sum + item.quantity,
                                    0
                                  )}{" "}
                                  {order.order_items.reduce(
                                    (sum, item) => sum + item.quantity,
                                    0
                                  ) > 1
                                    ? "items"
                                    : "item"}
                                </Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">
                                  Total
                                </Text>
                                <Text>{formatCurrency(order.total)}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">
                                  Shipping To
                                </Text>
                                <Text>{order.shipping_address.recipient_name}</Text>
                              </Box>
                            </SimpleGrid>
                          ) : (
                            <VStack align="flex-start" spacing={1} mb={3}>
                              <HStack justify="space-between" width="100%">
                                <Text fontSize="sm" color="gray.600">
                                  Items:
                                </Text>
                                <Text>
                                  {order.order_items.reduce(
                                    (sum, item) => sum + item.quantity,
                                    0
                                  )}{" "}
                                  {order.order_items.reduce(
                                    (sum, item) => sum + item.quantity,
                                    0
                                  ) > 1
                                    ? "items"
                                    : "item"}
                                </Text>
                              </HStack>
                              <HStack justify="space-between" width="100%">
                                <Text fontSize="sm" color="gray.600">
                                  Total:
                                </Text>
                                <Text>{formatCurrency(order.total)}</Text>
                              </HStack>
                              <HStack justify="space-between" width="100%">
                                <Text fontSize="sm" color="gray.600">
                                  Shipping To:
                                </Text>
                                <Text>{order.shipping_address.recipient_name}</Text>
                              </HStack>
                            </VStack>
                          )}

                          <Divider my={2} />

                          <Flex justify="space-between" align="center" mt={2}>
                            <Button
                              as={RouterLink}
                              to={`/orders/${order.id}`}
                              colorScheme="blue"
                              variant="outline"
                              size="sm"
                            >
                              View Details
                            </Button>

                            {order.status !== "cancelled" && 
                             order.status !== "delivered" &&
                             order.status !== "returned" && (
                              <Button
                                as={RouterLink}
                                to={`/orders/${order.id}/cancel`}
                                colorScheme="red"
                                variant="ghost"
                                size="sm"
                              >
                                Cancel Order
                              </Button>
                            )}

                            {order.status === "delivered" && !order.is_returned && (
                              <Button
                                as={RouterLink}
                                to={`/orders/${order.id}/return`}
                                colorScheme="orange"
                                variant="ghost"
                                size="sm"
                              >
                                Return Items
                              </Button>
                            )}
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  )}

                  {data && data.total > pageSize && (
                    <Pagination 
                      pagesCount={Math.ceil(data.total / pageSize)}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      colorScheme="blue"
                    >
                      <PaginationContainer mt={6} justify="center">
                        <PaginationPrevious mr={1}>Previous</PaginationPrevious>
                        <PaginationPageGroup>
                          {Array.from({ length: Math.ceil(data.total / pageSize) }).map((_, i) => (
                            <PaginationPage 
                              key={i + 1} 
                              page={i + 1} 
                              width={10}
                              fontSize="sm"
                            />
                          ))}
                        </PaginationPageGroup>
                        <PaginationNext ml={1}>Next</PaginationNext>
                      </PaginationContainer>
                    </Pagination>
                  )}
                </Box>
              </TabPanel>
            )
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default OrderList;
