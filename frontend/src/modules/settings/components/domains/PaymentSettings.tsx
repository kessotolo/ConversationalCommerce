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
  Stack,
  Button,
  Icon,
  Badge,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { FiPlus, FiCreditCard, FiDollarSign, FiSettings, FiShield } from 'react-icons/fi';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import { Setting } from '../../models/settings';

// Component to render a payment provider card
const PaymentProviderCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactElement;
  isActive: boolean;
  onActivate: () => void;
  onConfigure: () => void;
}> = ({ title, description, icon, isActive, onActivate, onConfigure }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue(
    isActive ? 'green.500' : 'gray.200',
    isActive ? 'green.300' : 'gray.600'
  );

  return (
    <Card
      variant="outline"
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth={isActive ? '4px' : '1px'}
      bg={cardBg}
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{ boxShadow: 'md' }}
    >
      <CardHeader>
        <Stack direction="row" align="center" justify="space-between">
          <Stack direction="row" align="center" spacing={3}>
            <Box
              p={2}
              bg={useColorModeValue('blue.50', 'blue.900')}
              color={useColorModeValue('blue.500', 'blue.200')}
              borderRadius="md"
            >
              {icon}
            </Box>
            <Box>
              <Heading size="sm">{title}</Heading>
              <Text fontSize="sm" mt={1}>
                {description}
              </Text>
            </Box>
          </Stack>
          {isActive && (
            <Badge colorScheme="green" variant="solid" fontSize="xs">
              Active
            </Badge>
          )}
        </Stack>
      </CardHeader>
      <Divider />
      <CardBody>
        <Stack direction="row" justify="flex-end" spacing={3}>
          {!isActive ? (
            <Button size="sm" colorScheme="blue" onClick={onActivate}>
              Activate
            </Button>
          ) : (
            <Button size="sm" colorScheme="gray" onClick={onConfigure}>
              Configure
            </Button>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

const PaymentSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [showProviderConfig, setShowProviderConfig] = useState(false);
  
  // Group settings by category for better organization
  const generalSettings = settings.filter(s => s.key.startsWith('payment.general'));
  const stripeSettings = settings.filter(s => s.key.startsWith('payment.providers.stripe'));
  const paypalSettings = settings.filter(s => s.key.startsWith('payment.providers.paypal'));
  const squareSettings = settings.filter(s => s.key.startsWith('payment.providers.square'));
  const manualSettings = settings.filter(s => s.key.startsWith('payment.providers.manual'));
  
  // Load payment settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const paymentSettingsDomain = await new SettingsService().getDomainByNameWithSettings('payment');
        setSettings(paymentSettingsDomain.settings);
        
        // Determine active provider
        const activeProviderSetting = paymentSettingsDomain.settings.find(s => s.key === 'payment.general.active_provider');
        if (activeProviderSetting) {
          setActiveProvider(activeProviderSetting.value);
        }
      } catch (err) {
        console.error('Failed to load payment settings:', err);
        setError('Failed to load payment settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  const handleActivateProvider = async (provider: string) => {
    try {
      // Find the active provider setting
      const activeProviderSetting = settings.find(s => s.key === 'payment.general.active_provider');
      
      if (activeProviderSetting) {
        // Update the active provider
        await new SettingsService().updateSetting(activeProviderSetting.id, provider);
        setActiveProvider(provider);
      }
      
      // Show the configuration panel for the newly activated provider
      setShowProviderConfig(true);
    } catch (error) {
      console.error('Failed to activate payment provider:', error);
      setError('Failed to activate payment provider. Please try again.');
    }
  };
  
  const handleConfigureProvider = () => {
    setShowProviderConfig(true);
  };
  
  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading payment settings...</Text>
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
  
  return (
    <Box>
      <Heading mb={6}>Payment Settings</Heading>
      <Text mb={8}>Configure payment providers and checkout options for your store.</Text>
      
      <Tabs variant="enclosed" isLazy>
        <TabList mb={4}>
          <Tab>Payment Providers</Tab>
          <Tab>Checkout Options</Tab>
          <Tab>Tax Settings</Tab>
          <Tab>Security</Tab>
        </TabList>
        
        <TabPanels>
          {/* Payment Providers */}
          <TabPanel>
            {!showProviderConfig ? (
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
                {/* Stripe */}
                <GridItem colSpan={1}>
                  <PaymentProviderCard
                    title="Stripe"
                    description="Accept credit cards, Apple Pay, and Google Pay"
                    icon={<Icon as={FiCreditCard} />}
                    isActive={activeProvider === 'stripe'}
                    onActivate={() => handleActivateProvider('stripe')}
                    onConfigure={handleConfigureProvider}
                  />
                </GridItem>
                
                {/* PayPal */}
                <GridItem colSpan={1}>
                  <PaymentProviderCard
                    title="PayPal"
                    description="Accept PayPal, credit cards, and buy now pay later"
                    icon={<Icon as={FiDollarSign} />}
                    isActive={activeProvider === 'paypal'}
                    onActivate={() => handleActivateProvider('paypal')}
                    onConfigure={handleConfigureProvider}
                  />
                </GridItem>
                
                {/* Square */}
                <GridItem colSpan={1}>
                  <PaymentProviderCard
                    title="Square"
                    description="Accept credit cards with Square payment processing"
                    icon={<Icon as={FiCreditCard} />}
                    isActive={activeProvider === 'square'}
                    onActivate={() => handleActivateProvider('square')}
                    onConfigure={handleConfigureProvider}
                  />
                </GridItem>
                
                {/* Manual Payments */}
                <GridItem colSpan={1}>
                  <PaymentProviderCard
                    title="Manual Payments"
                    description="Cash on delivery, bank transfers, and other offline methods"
                    icon={<Icon as={FiDollarSign} />}
                    isActive={activeProvider === 'manual'}
                    onActivate={() => handleActivateProvider('manual')}
                    onConfigure={handleConfigureProvider}
                  />
                </GridItem>
              </Grid>
            ) : (
              <Box>
                {/* Provider configuration forms */}
                <Button
                  mb={4}
                  variant="outline"
                  onClick={() => setShowProviderConfig(false)}
                >
                  Back to Payment Providers
                </Button>
                
                {activeProvider === 'stripe' && (
                  <SettingsForm
                    domainName="payment"
                    settings={stripeSettings}
                    title="Stripe Configuration"
                    description="Configure your Stripe payment gateway."
                  />
                )}
                
                {activeProvider === 'paypal' && (
                  <SettingsForm
                    domainName="payment"
                    settings={paypalSettings}
                    title="PayPal Configuration"
                    description="Configure your PayPal payment gateway."
                  />
                )}
                
                {activeProvider === 'square' && (
                  <SettingsForm
                    domainName="payment"
                    settings={squareSettings}
                    title="Square Configuration"
                    description="Configure your Square payment gateway."
                  />
                )}
                
                {activeProvider === 'manual' && (
                  <SettingsForm
                    domainName="payment"
                    settings={manualSettings}
                    title="Manual Payment Options"
                    description="Configure manual payment options such as cash on delivery or bank transfers."
                  />
                )}
              </Box>
            )}
          </TabPanel>
          
          {/* Checkout Options */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="payment"
                  settings={generalSettings.filter(s => s.key.startsWith('payment.general.checkout'))}
                  title="Checkout Settings"
                  description="Configure checkout options and settings."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Tax Settings */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="payment"
                  settings={generalSettings.filter(s => s.key.startsWith('payment.general.tax'))}
                  title="Tax Settings"
                  description="Configure tax rates and settings."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Security Settings */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="payment"
                  settings={generalSettings.filter(s => s.key.startsWith('payment.general.security'))}
                  title="Payment Security"
                  description="Configure payment security settings and fraud prevention."
                />
              </GridItem>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default PaymentSettings;
