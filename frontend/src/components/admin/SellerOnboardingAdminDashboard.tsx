import React, { useState } from "react";
import {
  Box,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";

// Import our modular components
import SellerVerificationStats from "./SellerVerificationStats";
import SellerVerificationList from "./SellerVerificationList";
import SellerVerificationDetail from "./SellerVerificationDetail";

const SellerOnboardingAdminDashboard: React.FC = () => {
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleViewVerificationDetails = (verificationId: string) => {
    setSelectedVerificationId(verificationId);
    onOpen();
  };

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={6}>
        Seller Onboarding Administration
      </Heading>

      <SellerVerificationStats />

      <Tabs variant="enclosed" colorScheme="blue" mt={8}>
        <TabList>
          <Tab>Pending Verifications</Tab>
          <Tab>In Review</Tab>
          <Tab>Additional Info Needed</Tab>
          <Tab>Approved</Tab>
          <Tab>Rejected</Tab>
          <Tab>All Verifications</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <SellerVerificationList
              onViewDetails={handleViewVerificationDetails}
              // These props would be passed to a real implementation
              // statusFilter="pending"
            />
          </TabPanel>
          <TabPanel>
            <SellerVerificationList
              onViewDetails={handleViewVerificationDetails}
              // statusFilter="in_review"
            />
          </TabPanel>
          <TabPanel>
            <SellerVerificationList
              onViewDetails={handleViewVerificationDetails}
              // statusFilter="additional_info_needed"
            />
          </TabPanel>
          <TabPanel>
            <SellerVerificationList
              onViewDetails={handleViewVerificationDetails}
              // statusFilter="approved"
            />
          </TabPanel>
          <TabPanel>
            <SellerVerificationList
              onViewDetails={handleViewVerificationDetails}
              // statusFilter="rejected"
            />
          </TabPanel>
          <TabPanel>
            <SellerVerificationList
              onViewDetails={handleViewVerificationDetails}
              // statusFilter=""  // No filter means all
            />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Verification Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedVerificationId && (
              <SellerVerificationDetail
                verificationId={selectedVerificationId}
                onClose={onClose}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SellerOnboardingAdminDashboard;
