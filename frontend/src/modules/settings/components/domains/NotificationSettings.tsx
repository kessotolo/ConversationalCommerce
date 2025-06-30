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
  Switch,
  Flex,
  Badge,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import { Setting } from '../../models/settings';

// NotificationType interface
interface NotificationType {
  id: string;
  name: string;
  description: string;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  category: 'orders' | 'customers' | 'products' | 'system' | 'marketing';
}

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);

  // Group settings by category for better organization
  const generalSettings = settings.filter(s => s.key.startsWith('notifications.general'));
  const emailSettings = settings.filter(s => s.key.startsWith('notifications.channels.email'));
  const smsSettings = settings.filter(s => s.key.startsWith('notifications.channels.sms'));
  const pushSettings = settings.filter(s => s.key.startsWith('notifications.channels.push'));
  const templateSettings = settings.filter(s => s.key.startsWith('notifications.templates'));
  
  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const notificationSettingsDomain = await new SettingsService().getDomainByNameWithSettings('notifications');
        setSettings(notificationSettingsDomain.settings);
        
        // In a real implementation, you would load notification types from the API
        // For this example, we'll use dummy data
        setNotificationTypes([
          {
            id: '1',
            name: 'Order Placed',
            description: 'Send notification when a new order is placed',
            channels: { email: true, sms: true, push: true, inApp: true },
            category: 'orders'
          },
          {
            id: '2',
            name: 'Order Shipped',
            description: 'Send notification when order is shipped',
            channels: { email: true, sms: true, push: true, inApp: true },
            category: 'orders'
          },
          {
            id: '3',
            name: 'Order Delivered',
            description: 'Send notification when order is delivered',
            channels: { email: true, sms: false, push: true, inApp: true },
            category: 'orders'
          },
          {
            id: '4',
            name: 'Customer Registration',
            description: 'Send notification when a new customer registers',
            channels: { email: true, sms: false, push: false, inApp: false },
            category: 'customers'
          },
          {
            id: '5',
            name: 'Product Low Stock',
            description: 'Send notification when product stock is low',
            channels: { email: true, sms: false, push: true, inApp: true },
            category: 'products'
          },
          {
            id: '6',
            name: 'System Backup',
            description: 'Send notification when system backup completes',
            channels: { email: true, sms: false, push: false, inApp: false },
            category: 'system'
          },
          {
            id: '7',
            name: 'Marketing Campaign',
            description: 'Send notification when marketing campaign is completed',
            channels: { email: true, sms: false, push: true, inApp: true },
            category: 'marketing'
          },
        ]);
      } catch (err) {
        console.error('Failed to load notification settings:', err);
        setError('Failed to load notification settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Toggle notification channel
  const toggleNotificationChannel = (notificationId: string, channel: keyof NotificationType['channels']) => {
    setNotificationTypes(types => 
      types.map(type => 
        type.id === notificationId 
          ? { 
              ...type, 
              channels: { 
                ...type.channels, 
                [channel]: !type.channels[channel] 
              } 
            } 
          : type
      )
    );
  };
  
  // Filter notification types by category
  const getNotificationsByCategory = (category: NotificationType['category']) => {
    return notificationTypes.filter(type => type.category === category);
  };
  
  // Render notification type controls
  const renderNotificationTypeCard = (notificationType: NotificationType) => {
    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    
    return (
      <Card 
        key={notificationType.id}
        variant="outline"
        borderColor={borderColor}
        bg={cardBg}
        mb={4}
      >
        <CardHeader pb={2}>
          <Stack direction="row" justify="space-between" align="center">
            <Box>
              <Heading size="sm">{notificationType.name}</Heading>
              <Text fontSize="sm" color="gray.500" mt={1}>
                {notificationType.description}
              </Text>
            </Box>
            <Badge colorScheme={notificationType.category === 'orders' ? 'blue' : 
                            notificationType.category === 'customers' ? 'green' :
                            notificationType.category === 'products' ? 'purple' :
                            notificationType.category === 'system' ? 'red' : 'orange'}>
              {notificationType.category.charAt(0).toUpperCase() + notificationType.category.slice(1)}
            </Badge>
          </Stack>
        </CardHeader>
        <Divider />
        <CardBody pt={4}>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={6}>
            <Flex align="center">
              <Text fontSize="sm" fontWeight="medium" mr={3}>Email</Text>
              <Switch 
                isChecked={notificationType.channels.email}
                onChange={() => toggleNotificationChannel(notificationType.id, 'email')}
                colorScheme="blue"
              />
            </Flex>
            <Flex align="center">
              <Text fontSize="sm" fontWeight="medium" mr={3}>SMS</Text>
              <Switch 
                isChecked={notificationType.channels.sms}
                onChange={() => toggleNotificationChannel(notificationType.id, 'sms')}
                colorScheme="green"
              />
            </Flex>
            <Flex align="center">
              <Text fontSize="sm" fontWeight="medium" mr={3}>Push</Text>
              <Switch 
                isChecked={notificationType.channels.push}
                onChange={() => toggleNotificationChannel(notificationType.id, 'push')}
                colorScheme="purple"
              />
            </Flex>
            <Flex align="center">
              <Text fontSize="sm" fontWeight="medium" mr={3}>In App</Text>
              <Switch 
                isChecked={notificationType.channels.inApp}
                onChange={() => toggleNotificationChannel(notificationType.id, 'inApp')}
                colorScheme="orange"
              />
            </Flex>
          </Stack>
        </CardBody>
      </Card>
    );
  };
  
  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading notification settings...</Text>
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
      <Heading mb={6}>Notification Settings</Heading>
      <Text mb={8}>Configure how and when notifications are sent to you, your team, and your customers.</Text>
      
      <Tabs variant="enclosed" isLazy>
        <TabList mb={4}>
          <Tab>General</Tab>
          <Tab>Email Settings</Tab>
          <Tab>SMS Settings</Tab>
          <Tab>Push Notifications</Tab>
          <Tab>Notification Types</Tab>
          <Tab>Templates</Tab>
        </TabList>
        
        <TabPanels>
          {/* General Settings */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="notifications"
                  settings={generalSettings}
                  title="General Notification Settings"
                  description="Configure notification defaults and preferences."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Email Settings */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="notifications"
                  settings={emailSettings}
                  title="Email Notification Settings"
                  description="Configure email sender, SMTP settings, and default email templates."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* SMS Settings */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="notifications"
                  settings={smsSettings}
                  title="SMS Notification Settings"
                  description="Configure SMS provider, sender ID, and message templates."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Push Notifications */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="notifications"
                  settings={pushSettings}
                  title="Push Notification Settings"
                  description="Configure push notification providers and defaults."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Notification Types */}
          <TabPanel>
            <Tabs variant="soft-rounded" colorScheme="blue" isLazy>
              <TabList mb={4}>
                <Tab>Orders</Tab>
                <Tab>Customers</Tab>
                <Tab>Products</Tab>
                <Tab>System</Tab>
                <Tab>Marketing</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  <Box>
                    {getNotificationsByCategory('orders').map(renderNotificationTypeCard)}
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box>
                    {getNotificationsByCategory('customers').map(renderNotificationTypeCard)}
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box>
                    {getNotificationsByCategory('products').map(renderNotificationTypeCard)}
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box>
                    {getNotificationsByCategory('system').map(renderNotificationTypeCard)}
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box>
                    {getNotificationsByCategory('marketing').map(renderNotificationTypeCard)}
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </TabPanel>
          
          {/* Templates */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="notifications"
                  settings={templateSettings}
                  title="Notification Templates"
                  description="Manage templates for different notification types."
                />
              </GridItem>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default NotificationSettings;
