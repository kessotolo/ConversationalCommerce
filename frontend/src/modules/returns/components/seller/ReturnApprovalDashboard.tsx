import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Flex,
  Badge,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { SearchIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { formatDate } from '@/utils/format';
import { ReturnService } from '@/modules/returns/services/ReturnService';
import { ReturnStatus, ReturnRequestResponse } from '@/modules/returns/models/return';
import { useTenantContext } from '@/modules/tenant/hooks/useTenantContext';
import { useRouter } from 'next/router';

const ReturnApprovalDashboard: React.FC = () => {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returns, setReturns] = useState<ReturnRequestResponse[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ReturnRequestResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Colors
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Fetch return requests when the component mounts
  useEffect(() => {
    const fetchReturns = async () => {
      if (!tenant?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, this would use pagination from the API
        // For now, we're fetching all returns and doing client-side pagination
        const response = await ReturnService.getAllReturnRequests(tenant.id, currentPage);
        
        setReturns(response.items);
        setTotalPages(Math.ceil(response.total / response.page_size));
        
      } catch (err) {
        setError('Failed to load return requests');
        console.error('Error fetching returns:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReturns();
  }, [tenant?.id, currentPage]);
  
  // Apply filters whenever returns, status filter, or search query changes
  useEffect(() => {
    let filtered = [...returns];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.return_number.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.customer_id.toLowerCase().includes(query)
      );
    }
    
    setFilteredReturns(filtered);
  }, [returns, statusFilter, searchQuery]);
  
  // Get status badge color
  const getStatusColor = (status: ReturnStatus): string => {
    const statusColors: Record<ReturnStatus, string> = {
      [ReturnStatus.REQUESTED]: 'blue',
      [ReturnStatus.UNDER_REVIEW]: 'purple',
      [ReturnStatus.APPROVED]: 'green',
      [ReturnStatus.RECEIVED]: 'teal',
      [ReturnStatus.PARTIAL_APPROVED]: 'yellow',
      [ReturnStatus.REJECTED]: 'red',
      [ReturnStatus.CANCELLED]: 'gray',
      [ReturnStatus.COMPLETED]: 'green'
    };
    
    return statusColors[status] || 'gray';
  };
  
  // Navigate to return details
  const handleViewReturn = (returnId: string) => {
    router.push(`/seller/returns/${returnId}`);
  };
  
  if (!tenant?.id) {
    return (
      <Alert status="error">
        <AlertIcon />
        Tenant information not available
      </Alert>
    );
  }
  
  return (
    <Box>
      <Heading size="lg" mb={6}>Return Requests</Heading>
      
      <Tabs variant="enclosed" mb={6}>
        <TabList>
          <Tab>All Returns</Tab>
          <Tab>Pending Approval</Tab>
          <Tab>Approved</Tab>
          <Tab>Completed</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel p={0} pt={4}>
            {/* Header with filters */}
            <Flex 
              direction={['column', 'row']} 
              justify="space-between" 
              align={['stretch', 'center']}
              mb={4}
              gap={4}
            >
              <InputGroup maxW={['100%', '320px']}>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input 
                  placeholder="Search by return # or customer" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
              
              <HStack spacing={4}>
                <Select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  w={['100%', '180px']}
                >
                  <option value="all">All Statuses</option>
                  {Object.values(ReturnStatus).map(status => (
                    <option key={status} value={status}>
                      {ReturnService.getStatusDescriptions()[status]}
                    </option>
                  ))}
                </Select>
              </HStack>
            </Flex>
            
            {/* Returns list */}
            {loading ? (
              <Flex justify="center" align="center" h="200px">
                <Spinner size="xl" color="blue.500" />
              </Flex>
            ) : error ? (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            ) : filteredReturns.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No return requests found matching your criteria
              </Alert>
            ) : (
              <TableContainer>
                <Table variant="simple" size="md">
                  <Thead>
                    <Tr>
                      <Th>Return #</Th>
                      <Th>Date</Th>
                      <Th>Items</Th>
                      <Th>Status</Th>
                      <Th>Reason</Th>
                      <Th>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredReturns.map((returnRequest) => (
                      <Tr 
                        key={returnRequest.id}
                        _hover={{ bg: useColorModeValue('gray.50', 'gray.900') }}
                        cursor="pointer"
                        onClick={() => handleViewReturn(returnRequest.id)}
                      >
                        <Td fontWeight="medium">{returnRequest.return_number}</Td>
                        <Td>{formatDate(returnRequest.requested_at)}</Td>
                        <Td>{returnRequest.items?.length || 0} item(s)</Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(returnRequest.status)}>
                            {ReturnService.getStatusDescriptions()[returnRequest.status]}
                          </Badge>
                        </Td>
                        <Td>{ReturnService.getReasonDescriptions()[returnRequest.reason]}</Td>
                        <Td>
                          <Button 
                            rightIcon={<ChevronRightIcon />} 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReturn(returnRequest.id);
                            }}
                          >
                            Review
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Flex justify="center" mt={6}>
                <HStack>
                  <Button
                    isDisabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  
                  <Text>Page {currentPage} of {totalPages}</Text>
                  
                  <Button
                    isDisabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </HStack>
              </Flex>
            )}
          </TabPanel>
          
          {/* Additional tabs (simplified implementation) */}
          <TabPanel>
            <Text>Pending approval returns will be displayed here</Text>
          </TabPanel>
          <TabPanel>
            <Text>Approved returns will be displayed here</Text>
          </TabPanel>
          <TabPanel>
            <Text>Completed returns will be displayed here</Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default ReturnApprovalDashboard;
