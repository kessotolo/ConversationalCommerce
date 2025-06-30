import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stack,
  Button,
  Icon,
  Badge,
  Image,
  Flex,
  Link,
  Divider,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FiPlus, FiRefreshCw, FiExternalLink, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import { Setting } from '../../models/settings';

// Integration interface
interface Integration {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  category: 'marketing' | 'payment' | 'shipping' | 'accounting' | 'crm' | 'analytics' | 'marketplace';
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  hasSettings: boolean;
}

const IntegrationsSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const toast = useToast();
  
  // Filter integrations by category
  const getIntegrationsByCategory = (category: Integration['category']) => {
    return integrations.filter(integration => integration.category === category);
  };
  
  // Load integration settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const integrationsSettingsDomain = await new SettingsService().getDomainByNameWithSettings('integrations');
        setSettings(integrationsSettingsDomain.settings);
        
        // In a real implementation, you would load integrations from the API
        // For this example, we'll use dummy data
        setIntegrations([
          {
            id: '1',
            name: 'Google Analytics',
            description: 'Track website traffic and user behavior',
            logoUrl: 'https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg',
            category: 'analytics',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '2',
            name: 'Facebook Ads',
            description: 'Manage Facebook ad campaigns',
            logoUrl: 'https://www.facebook.com/images/fb_icon_325x325.png',
            category: 'marketing',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '3',
            name: 'Mailchimp',
            description: 'Email marketing and automation',
            logoUrl: 'https://cdn-images.mailchimp.com/icons/social-block-v2/outline-color-48.png',
            category: 'marketing',
            status: 'disconnected',
            hasSettings: true,
          },
          {
            id: '4',
            name: 'QuickBooks',
            description: 'Accounting and bookkeeping',
            logoUrl: 'https://quickbooks.intuit.com/cas/dam/IMAGE/A81QR5Ay/icom-blue-large.png',
            category: 'accounting',
            status: 'disconnected',
            hasSettings: true,
          },
          {
            id: '5',
            name: 'Shopify',
            description: 'Sync products with Shopify store',
            logoUrl: 'https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo-primary-logo-456baa801ee66a0a435671082365958316831c9960c480451dd0330bcdae304f.svg',
            category: 'marketplace',
            status: 'error',
            hasSettings: true,
          },
          {
            id: '6',
            name: 'Salesforce',
            description: 'Customer relationship management',
            logoUrl: 'https://c1.sfdcstatic.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg',
            category: 'crm',
            status: 'pending',
            hasSettings: true,
          },
          {
            id: '7',
            name: 'UPS',
            description: 'Shipping rate calculation and label printing',
            logoUrl: 'https://www.ups.com/assets/resources/images/UPS_logo.svg',
            category: 'shipping',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '8',
            name: 'Amazon Marketplace',
            description: 'Sell products on Amazon',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png',
            category: 'marketplace',
            status: 'disconnected',
            hasSettings: true,
          },
          {
            id: '9',
            name: 'Stripe',
            description: 'Payment processing',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png',
            category: 'payment',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '10',
            name: 'HubSpot',
            description: 'CRM and marketing automation',
            logoUrl: 'https://www.hubspot.com/hubfs/assets/hubspot.com/style-guide/brand-guidelines/guidelines_the-logo.svg',
            category: 'crm',
            status: 'disconnected',
            hasSettings: true,
          },
        ]);
      } catch (err) {
        console.error('Failed to load integration settings:', err);
        setError('Failed to load integration settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  const handleConnect = (integration: Integration) => {
    // In a real implementation, this would open an OAuth flow or settings panel
    toast({
      title: 'Connecting...',
      description: `Opening connection flow for ${integration.name}`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    
    // Simulate connection process
    setTimeout(() => {
      setIntegrations(prevIntegrations =>
        prevIntegrations.map(item =>
          item.id === integration.id
            ? { ...item, status: 'connected' }
            : item
        )
      );
      
      toast({
        title: 'Connected!',
        description: `Successfully connected to ${integration.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }, 2000);
  };
  
  const handleDisconnect = (integration: Integration) => {
    // In a real implementation, this would revoke OAuth tokens or disable the integration
    toast({
      title: 'Disconnecting...',
      description: `Disconnecting from ${integration.name}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
    
    // Simulate disconnection process
    setTimeout(() => {
      setIntegrations(prevIntegrations =>
        prevIntegrations.map(item =>
          item.id === integration.id
            ? { ...item, status: 'disconnected' }
            : item
        )
      );
      
      toast({
        title: 'Disconnected',
        description: `Successfully disconnected from ${integration.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }, 1000);
  };
  
  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
  };
  
  const renderIntegrationCard = (integration: Integration) => {
    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    
    const getStatusBadge = (status: Integration['status']) => {
      switch (status) {
        case 'connected':
          return <Badge colorScheme="green">Connected</Badge>;
        case 'disconnected':
          return <Badge colorScheme="gray">Disconnected</Badge>;
        case 'pending':
          return <Badge colorScheme="yellow">Pending</Badge>;
        case 'error':
          return <Badge colorScheme="red">Error</Badge>;
        default:
          return null;
      }
    };
    
    return (
      <Card
        key={integration.id}
        variant="outline"
        borderColor={borderColor}
        bg={cardBg}
        mb={4}
      >
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={4}>
              <Box width="40px" height="40px" overflow="hidden">
                <Image 
                  src={integration.logoUrl} 
                  alt={`${integration.name} logo`}
                  fallbackSrc="https://via.placeholder.com/40"
                  objectFit="contain"
                  width="100%"
                  height="100%"
                />
              </Box>
              <Box>
                <Heading size="sm">{integration.name}</Heading>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  {integration.description}
                </Text>
              </Box>
            </Flex>
            {getStatusBadge(integration.status)}
          </Flex>
        </CardHeader>
        <Divider />
        <CardFooter pt={3} pb={3}>
          <Flex justify="flex-end" width="100%">
            {integration.status === 'connected' ? (
              <>
                <Button 
                  size="sm" 
                  rightIcon={<FiXCircle />} 
                  variant="outline" 
                  colorScheme="red"
                  onClick={() => handleDisconnect(integration)}
                  mr={2}
                >
                  Disconnect
                </Button>
                {integration.hasSettings && (
                  <Button 
                    size="sm" 
                    rightIcon={<FiSettings />} 
                    variant="solid" 
                    colorScheme="blue"
                    onClick={() => handleConfigureIntegration(integration)}
                  >
                    Configure
                  </Button>
                )}
              </>
            ) : (
              <Button 
                size="sm" 
                rightIcon={<FiExternalLink />} 
                colorScheme="blue"
                onClick={() => handleConnect(integration)}
              >
                Connect
              </Button>
            )}
          </Flex>
        </CardFooter>
      </Card>
    );
  };
  
  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading integration settings...</Text>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle mr={2}>Error!</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  // If an integration is selected, show its settings
  if (selectedIntegration) {
    const integrationSettings = settings.filter(s => s.key.startsWith(`integrations.${selectedIntegration.name.toLowerCase().replace(/\s+/g, '_')}`));
    
    return (
      <Box>
        <Button 
          leftIcon={<Icon as={FiRefreshCw} />} 
          variant="outline" 
          mb={6}
          onClick={() => setSelectedIntegration(null)}
        >
          Back to All Integrations
        </Button>
        
        <Heading mb={4} size="lg">{selectedIntegration.name} Settings</Heading>
        <Text mb={8}>Configure your integration with {selectedIntegration.name}.</Text>
        
        <SettingsForm
          domainName="integrations"
          settings={integrationSettings}
          title="Integration Configuration"
          description={`Configure your ${selectedIntegration.name} integration settings.`}
        />
      </Box>
    );
  }
  
  return (
    <Box>
      <Heading mb={6}>Integrations Settings</Heading>
      <Text mb={8}>Connect and configure integrations with external services and platforms.</Text>
      
      <Tabs variant="enclosed" isLazy>
        <TabList mb={4}>
          <Tab>All</Tab>
          <Tab>Marketing</Tab>
          <Tab>Payment</Tab>
          <Tab>Shipping</Tab>
          <Tab>Accounting</Tab>
          <Tab>CRM</Tab>
          <Tab>Analytics</Tab>
          <Tab>Marketplace</Tab>
        </TabList>
        
        <TabPanels>
          {/* All Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {integrations.map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
          
          {/* Marketing Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {getIntegrationsByCategory('marketing').map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
          
          {/* Payment Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {getIntegrationsByCategory('payment').map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
          
          {/* Shipping Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {getIntegrationsByCategory('shipping').map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
          
          {/* Accounting Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {getIntegrationsByCategory('accounting').map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
          
          {/* CRM Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {getIntegrationsByCategory('crm').map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
          
          {/* Analytics Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {getIntegrationsByCategory('analytics').map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
          
          {/* Marketplace Integrations */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {getIntegrationsByCategory('marketplace').map((integration) => (
                <GridItem key={integration.id} colSpan={1}>
                  {renderIntegrationCard(integration)}
                </GridItem>
              ))}
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default IntegrationsSettings;
