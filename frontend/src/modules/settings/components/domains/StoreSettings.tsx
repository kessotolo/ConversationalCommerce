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
  useToast,
} from '@chakra-ui/react';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import { Setting } from '../../models/settings';

const StoreSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  // Group settings by category for better organization
  const generalSettings = settings.filter(s => s.key.startsWith('store.general'));
  const contactSettings = settings.filter(s => s.key.startsWith('store.contact'));
  const socialSettings = settings.filter(s => s.key.startsWith('store.social'));
  const localizationSettings = settings.filter(s => s.key.startsWith('store.localization'));
  const brandingSettings = settings.filter(s => s.key.startsWith('store.branding'));
  
  // Load store settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const storeSettingsDomain = await new SettingsService().getDomainByNameWithSettings('store');
        setSettings(storeSettingsDomain.settings);
        
        // If no settings exist yet, create default store settings
        if (storeSettingsDomain.settings.length === 0) {
          await initializeDefaultSettings();
        }
      } catch (err) {
        console.error('Failed to load store settings:', err);
        setError('Failed to load store settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Initialize default settings if none exist
  const initializeDefaultSettings = async () => {
    try {
      // This would be a call to create default settings on the backend
      // In a real implementation, this would create all the necessary store settings
      toast({
        title: 'Creating default store settings',
        description: 'Default store settings are being created.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      // After creating default settings, reload them
      const storeSettingsDomain = await new SettingsService().getDomainByNameWithSettings('store');
      setSettings(storeSettingsDomain.settings);
    } catch (err) {
      console.error('Failed to initialize default settings:', err);
      setError('Failed to initialize default store settings.');
    }
  };
  
  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading store settings...</Text>
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
      <Heading mb={6}>Store Settings</Heading>
      <Text mb={8}>Manage your store information, branding, and policies.</Text>
      
      <Tabs variant="enclosed" isLazy>
        <TabList mb={4}>
          <Tab>General</Tab>
          <Tab>Contact Information</Tab>
          <Tab>Branding</Tab>
          <Tab>Localization</Tab>
          <Tab>Social Media</Tab>
        </TabList>
        
        <TabPanels>
          {/* General Settings */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="store"
                  settings={generalSettings}
                  title="General Store Information"
                  description="Basic information about your store."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Contact Information */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="store"
                  settings={contactSettings}
                  title="Contact Information"
                  description="How customers can reach you."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Branding */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="store"
                  settings={brandingSettings}
                  title="Store Branding"
                  description="Customize your store's look and feel."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Localization */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="store"
                  settings={localizationSettings}
                  title="Localization"
                  description="Language, currency, and regional settings."
                />
              </GridItem>
            </Grid>
          </TabPanel>
          
          {/* Social Media */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <SettingsForm
                  domainName="store"
                  settings={socialSettings}
                  title="Social Media"
                  description="Connect your store to social media platforms."
                />
              </GridItem>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default StoreSettings;
