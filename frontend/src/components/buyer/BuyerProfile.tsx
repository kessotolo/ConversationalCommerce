import React from "react";
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Container,
  Heading,
} from "@chakra-ui/react";

// Import all our profile components
import ProfileEditForm from "./ProfileEditForm";
import NotificationPreferencesForm from "./NotificationPreferencesForm";
import AddressList from "./AddressList";
import PaymentMethodManagement from "./PaymentMethodManagement";

const BuyerProfile: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={8}>
        My Account
      </Heading>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Profile</Tab>
          <Tab>Addresses</Tab>
          <Tab>Payment Methods</Tab>
          <Tab>Notifications</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Box maxW="container.md" mx="auto">
              <ProfileEditForm />
            </Box>
          </TabPanel>
          
          <TabPanel>
            <AddressList />
          </TabPanel>
          
          <TabPanel>
            <PaymentMethodManagement />
          </TabPanel>
          
          <TabPanel>
            <Box maxW="container.md" mx="auto">
              <NotificationPreferencesForm />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default BuyerProfile;
