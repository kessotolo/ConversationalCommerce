import React, { useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Select,
  HStack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useQuery } from "react-query";
import { getVerifications } from "../../services/sellerOnboardingService";

interface VerificationListProps {
  onViewDetails: (verificationId: string) => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "yellow";
    case "in_review":
      return "blue";
    case "approved":
      return "green";
    case "rejected":
      return "red";
    case "additional_info_needed":
      return "orange";
    default:
      return "gray";
  }
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case "identity":
      return "purple";
    case "business":
      return "cyan";
    case "banking":
      return "teal";
    case "tax":
      return "blue";
    case "address":
      return "green";
    default:
      return "gray";
  }
};

const SellerVerificationList: React.FC<VerificationListProps> = ({ onViewDetails }) => {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const toast = useToast();

  const { data: verifications = [], isLoading, error } = useQuery(
    ["verifications", statusFilter, typeFilter],
    () => getVerifications(statusFilter, typeFilter)
  );

  if (isLoading) {
    return <Text>Loading verification requests...</Text>;
  }

  if (error) {
    return (
      <Text color="red.500">
        Error loading verification requests: {(error as Error).message}
      </Text>
    );
  }

  return (
    <Box>
      <HStack spacing={4} mb={4}>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          width="auto"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="additional_info_needed">Additional Info Needed</option>
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          width="auto"
        >
          <option value="">All Types</option>
          <option value="identity">Identity</option>
          <option value="business">Business</option>
          <option value="banking">Banking</option>
          <option value="tax">Tax</option>
          <option value="address">Address</option>
        </Select>
      </HStack>

      {verifications.length === 0 ? (
        <Text textAlign="center" p={6}>
          No verification requests match your filters.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Seller</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {verifications.map((verification) => (
                <Tr key={verification.id}>
                  <Td>{verification.seller_id}</Td>
                  <Td>
                    <Badge colorScheme={getTypeColor(verification.verification_type)}>
                      {verification.verification_type.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(verification.status)}>
                      {verification.status.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td>
                    {new Date(verification.submitted_at).toLocaleDateString()}
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => onViewDetails(verification.id)}
                    >
                      Review
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default SellerVerificationList;
