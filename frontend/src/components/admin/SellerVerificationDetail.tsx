import React, { useState } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Image,
  Badge,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  Divider,
  SimpleGrid,
  Flex,
  Link,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Switch,
} from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  getVerificationDetails,
  updateVerificationStatus,
  VerificationAdminUpdate,
} from "../../services/sellerOnboardingService";
import {
  sendVerificationStatusNotification,
  sendAdditionalInfoRequestNotification,
  sendRejectionNotification,
} from "../../services/notificationService";

interface VerificationDetailProps {
  verificationId: string;
  onClose: () => void;
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

const SellerVerificationDetail: React.FC<VerificationDetailProps> = ({
  verificationId,
  onClose,
}) => {
  const [notes, setNotes] = useState("");
  const [additionalInfoRequest, setAdditionalInfoRequest] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "additional_info" | null
  >(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const cancelRef = React.useRef(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: verification, isLoading, error } = useQuery(
    ["verification", verificationId],
    () => getVerificationDetails(verificationId)
  );

  const updateMutation = useMutation(
    async (data: { id: string; update: VerificationAdminUpdate }) => {
      // First update the verification status
      const updatedVerification = await updateVerificationStatus(data.id, data.update);
      
      // Then send notifications if enabled
      if (sendNotification && verification) {
        try {
          if (data.update.status === "approved") {
            await sendVerificationStatusNotification(
              verification.seller_id,
              verification.verification_type,
              "approved",
              data.update.notes
            );
          } else if (data.update.status === "rejected" && data.update.rejection_reason) {
            await sendRejectionNotification(
              verification.seller_id,
              verification.verification_type,
              data.update.rejection_reason
            );
          } else if (data.update.status === "additional_info_needed" && data.update.additional_info_requested) {
            await sendAdditionalInfoRequestNotification(
              verification.seller_id,
              verification.verification_type,
              data.update.additional_info_requested
            );
          }
        } catch (notificationErr) {
          console.error("Failed to send notification:", notificationErr);
          // Don't fail the whole operation if notification fails
        }
      }
      
      return updatedVerification;
    },
    {
      onSuccess: () => {
        toast({
          title: "Verification status updated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        queryClient.invalidateQueries("verifications");
        queryClient.invalidateQueries(["verification", verificationId]);
        queryClient.invalidateQueries("sellerDashboardStats");
        onClose();
      },
      onError: (err: any) => {
        toast({
          title: "Error updating verification status",
          description: err.message || "An error occurred",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const handleAction = (type: "approve" | "reject" | "additional_info") => {
    setActionType(type);
    setIsDialogOpen(true);
  };

  const confirmAction = () => {
    if (!actionType) return;

    const updateData: VerificationAdminUpdate = {
      status:
        actionType === "approve"
          ? "approved"
          : actionType === "reject"
          ? "rejected"
          : "additional_info_needed",
      notes: notes,
    };

    if (actionType === "reject") {
      updateData.rejection_reason = rejectionReason;
    }

    if (actionType === "additional_info") {
      updateData.additional_info_requested = additionalInfoRequest;
    }

    updateMutation.mutate({
      id: verificationId,
      update: updateData,
    });
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <Text>Loading verification details...</Text>;
  }

  if (error || !verification) {
    return (
      <Text color="red.500">
        Error loading verification details: {(error as Error)?.message || "Unknown error"}
      </Text>
    );
  }

  const isPending = verification.status === "pending";
  const isInReview = verification.status === "in_review";
  const isReviewed = ["approved", "rejected", "additional_info_needed"].includes(
    verification.status
  );

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">
          Verification Detail ({verification.verification_type.replace(/_/g, " ")})
        </Heading>
        <Badge colorScheme={getStatusColor(verification.status)} fontSize="md" p={1}>
          {verification.status.replace(/_/g, " ")}
        </Badge>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
        <Box>
          <Heading size="sm" mb={2}>
            Verification Information
          </Heading>
          <VStack align="start" spacing={2}>
            <Text>
              <strong>ID:</strong> {verification.id}
            </Text>
            <Text>
              <strong>Seller ID:</strong> {verification.seller_id}
            </Text>
            <Text>
              <strong>Type:</strong> {verification.verification_type.replace(/_/g, " ")}
            </Text>
            <Text>
              <strong>Status:</strong> {verification.status.replace(/_/g, " ")}
            </Text>
            <Text>
              <strong>Submitted:</strong>{" "}
              {new Date(verification.submitted_at).toLocaleString()}
            </Text>
            {verification.reviewed_at && (
              <Text>
                <strong>Reviewed:</strong>{" "}
                {new Date(verification.reviewed_at).toLocaleString()}
              </Text>
            )}
            {verification.reviewed_by && (
              <Text>
                <strong>Reviewed by:</strong> {verification.reviewed_by}
              </Text>
            )}
          </VStack>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>
            Verification Data
          </Heading>
          {verification.verification_data ? (
            <VStack align="start" spacing={2}>
              {Object.entries(verification.verification_data).map(([key, value]) => (
                <Text key={key}>
                  <strong>{key.replace(/_/g, " ")}:</strong>{" "}
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </Text>
              ))}
            </VStack>
          ) : (
            <Text>No verification data provided</Text>
          )}
        </Box>
      </SimpleGrid>

      {verification.document_ids && verification.document_ids.length > 0 && (
        <Box mb={6}>
          <Heading size="sm" mb={2}>
            Documents
          </Heading>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
            {verification.document_ids.map((docId, index) => (
              <Box
                key={docId}
                borderWidth="1px"
                borderRadius="md"
                overflow="hidden"
                p={2}
              >
                <Text mb={2}>Document {index + 1}</Text>
                <Link href={`/api/v1/documents/${docId}`} isExternal>
                  View Document <ExternalLinkIcon mx="2px" />
                </Link>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {verification.notes && (
        <Box mb={6}>
          <Heading size="sm" mb={2}>
            Notes
          </Heading>
          <Box p={3} borderWidth="1px" borderRadius="md">
            <Text>{verification.notes}</Text>
          </Box>
        </Box>
      )}

      {verification.rejection_reason && (
        <Box mb={6}>
          <Heading size="sm" mb={2}>
            Rejection Reason
          </Heading>
          <Box p={3} borderWidth="1px" borderRadius="md" bg="red.50">
            <Text>{verification.rejection_reason}</Text>
          </Box>
        </Box>
      )}

      {verification.additional_info_requested && (
        <Box mb={6}>
          <Heading size="sm" mb={2}>
            Additional Information Requested
          </Heading>
          <Box p={3} borderWidth="1px" borderRadius="md" bg="yellow.50">
            <Text>{verification.additional_info_requested}</Text>
          </Box>
        </Box>
      )}

      <Divider my={4} />

      {(isPending || isInReview) && (
        <Box>
          <Heading size="sm" mb={4}>
            Review Actions
          </Heading>

          <FormControl mb={4}>
            <FormLabel>Admin Notes</FormLabel>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this verification (optional)"
            />
          </FormControl>

          <HStack spacing={4} mt={6}>
            <Button
              colorScheme="green"
              onClick={() => handleAction("approve")}
              isLoading={updateMutation.isLoading}
            >
              Approve
            </Button>
            <Button
              colorScheme="red"
              onClick={() => handleAction("reject")}
              isLoading={updateMutation.isLoading}
            >
              Reject
            </Button>
            <Button
              colorScheme="yellow"
              onClick={() => handleAction("additional_info")}
              isLoading={updateMutation.isLoading}
            >
              Request Info
            </Button>
          </HStack>
        </Box>
      )}

      <AlertDialog
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {actionType === "approve"
                ? "Approve Verification"
                : actionType === "reject"
                ? "Reject Verification"
                : "Request Additional Information"}
            </AlertDialogHeader>
            <AlertDialogBody>
              {actionType === "approve" ? (
                <Text>Are you sure you want to approve this verification?</Text>
              ) : actionType === "reject" ? (
                <FormControl isRequired>
                  <FormLabel>Rejection Reason</FormLabel>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejecting this verification"
                  />
                </FormControl>
              ) : (
                <FormControl isRequired>
                  <FormLabel>Additional Information Needed</FormLabel>
                  <Textarea
                    value={additionalInfoRequest}
                    onChange={(e) => setAdditionalInfoRequest(e.target.value)}
                    placeholder="Specify what additional information is needed"
                  />
                </FormControl>
              )}
              
              <FormControl display="flex" alignItems="center" mt={4}>
                <FormLabel mb="0">
                  Send notification to seller
                </FormLabel>
                <Switch
                  isChecked={sendNotification}
                  onChange={() => setSendNotification(!sendNotification)}
                  colorScheme="blue"
                />
              </FormControl>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                colorScheme={
                  actionType === "approve"
                    ? "green"
                    : actionType === "reject"
                    ? "red"
                    : "yellow"
                }
                onClick={confirmAction}
                ml={3}
                isDisabled={
                  (actionType === "reject" && !rejectionReason) ||
                  (actionType === "additional_info" && !additionalInfoRequest)
                }
              >
                Confirm
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default SellerVerificationDetail;
