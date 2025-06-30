import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Stack,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Divider,
  Container,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  LocalShipping as TruckIcon,
  Inventory as PackageIcon,
  Map as MapIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import type { Setting } from '../../models/settings';

// Shipping Zone interface
interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
  description?: string;
}

// Shipping Method interface
interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  calculationType: 'flat_rate' | 'weight_based' | 'price_based';
  estimatedDelivery: string;
  isActive: boolean;
  zoneId?: string;
}

const DUMMY_ZONES: ShippingZone[] = [
  { id: '1', name: 'Domestic', countries: ['United States'], isActive: true },
  { id: '2', name: 'Canada', countries: ['Canada'], isActive: true },
  { id: '3', name: 'Europe', countries: ['United Kingdom', 'France', 'Germany', 'Spain', 'Italy'], isActive: true },
  { id: '4', name: 'Asia Pacific', countries: ['Australia', 'Japan', 'Singapore'], isActive: false },
];

const DUMMY_METHODS: ShippingMethod[] = [
  { id: '1', name: 'Standard Shipping', price: 5.99, calculationType: 'flat_rate', estimatedDelivery: '3-5 business days', isActive: true, zoneId: '1' },
  { id: '2', name: 'Express Shipping', price: 12.99, calculationType: 'flat_rate', estimatedDelivery: '1-2 business days', isActive: true, zoneId: '1' },
  { id: '3', name: 'Canada Post', price: 8.99, calculationType: 'flat_rate', estimatedDelivery: '5-7 business days', isActive: true, zoneId: '2' },
  { id: '4', name: 'DHL International', price: 15.99, calculationType: 'weight_based', estimatedDelivery: '3-7 business days', isActive: true, zoneId: '3' },
];

// Sample settings for different tabs
const dummyGeneralSettings: Setting[] = [
  { 
    id: 'shipping_calculator', 
    key: 'shipping.general.calculator', 
    value: 'true', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 1,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'shipping_cost_display', 
    key: 'shipping.general.cost_display', 
    value: 'true', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 2,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'default_shipping_country', 
    key: 'shipping.general.default_country', 
    value: 'US', 
    valueType: 'string',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: true,
    uiOrder: 3,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
];

const dummyCarrierSettings: Setting[] = [
  { 
    id: 'usps_enabled', 
    key: 'shipping.carriers.usps', 
    value: 'true', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 1,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'fedex_enabled', 
    key: 'shipping.carriers.fedex', 
    value: 'true', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 2,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'ups_enabled', 
    key: 'shipping.carriers.ups', 
    value: 'false', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 3,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'dhl_enabled', 
    key: 'shipping.carriers.dhl', 
    value: 'false', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 4,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
];

const dummyPackagingSettings: Setting[] = [
  { 
    id: 'default_box_size', 
    key: 'shipping.packaging.default_size', 
    value: 'medium', 
    valueType: 'string',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: true,
    uiOrder: 1,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'use_flat_rate_boxes', 
    key: 'shipping.packaging.flat_rate', 
    value: 'true', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 2,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'include_packaging_weight', 
    key: 'shipping.packaging.include_weight', 
    value: 'true', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 3,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
];

const dummyFulfillmentSettings: Setting[] = [
  { 
    id: 'auto_fulfill_paid_orders', 
    key: 'shipping.fulfillment.auto_fulfill', 
    value: 'false', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 1,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'send_tracking_emails', 
    key: 'shipping.fulfillment.tracking_emails', 
    value: 'true', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 2,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'ship_to_billing', 
    key: 'shipping.fulfillment.ship_to_billing', 
    value: 'false', 
    valueType: 'boolean',
    domainId: 'shipping',
    isEncrypted: false,
    isSystem: false,
    isRequired: false,
    uiOrder: 3,
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
];

// Custom TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`shipping-tabpanel-${index}`}
      aria-labelledby={`shipping-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ShippingSettings: React.FC = () => {
  // State management
  const [settings, setSettings] = useState<Setting[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Set to false for now to see the UI
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>(DUMMY_ZONES);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(DUMMY_METHODS);
  const [activeZone, setActiveZone] = useState<ShippingZone | null>(null);
  const [zoneFormData, setZoneFormData] = useState<Partial<ShippingZone>>({});
  
  // Tab handling
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Dialog handlers
  const onClose = () => {
    setDialogOpen(false);
    setError(null);
  };
  
  // Zone handlers
  const openNewZoneForm = () => {
    setActiveZone(null);
    setZoneFormData({
      name: '',
      countries: [],
      isActive: true
    });
    setDialogOpen(true);
  };
  
  const openZoneDetails = (zone: ShippingZone) => {
    setActiveZone(zone);
    setZoneFormData({ ...zone });
    setDialogOpen(true);
  };
  
  const toggleZoneActive = (zoneId: string) => {
    setShippingZones(zones => zones.map(zone => 
      zone.id === zoneId ? { ...zone, isActive: !zone.isActive } : zone
    ));
  };
  
  const deleteZone = (zoneId: string) => {
    if (window.confirm('Are you sure you want to delete this shipping zone? This action cannot be undone.')) {
      try {
        setShippingZones(zones => zones.filter(zone => zone.id !== zoneId));
        // Also remove any shipping methods associated with this zone
        setShippingMethods(methods => methods.filter(method => method.zoneId !== zoneId));
      } catch (err) {
        console.error('Failed to delete shipping zone:', err);
        setError('Failed to delete shipping zone. Please try again.');
      }
    }
  };
  
  // Method handlers
  const toggleMethodActive = (methodId: string) => {
    setShippingMethods(methods => methods.map(method => 
      method.id === methodId ? { ...method, isActive: !method.isActive } : method
    ));
  };
  
  const addShippingMethod = () => {
    window.alert('Shipping method form would open here.');
    // Implementation would depend on your modal/form structure
  };
  
  const deleteShippingMethod = (methodId: string) => {
    if (window.confirm('Are you sure you want to delete this shipping method? This action cannot be undone.')) {
      try {
        setShippingMethods(methods => methods.filter(method => method.id !== methodId));
      } catch (err) {
        console.error('Failed to delete shipping method:', err);
        setError('Failed to delete shipping method. Please try again.');
      }
    }
  };
  
  // Save zone form data
  const handleSaveZone = () => {
    // Validation
    if (!zoneFormData.name || !zoneFormData.countries || zoneFormData.countries.length === 0) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (activeZone) {
        // Update existing zone
        setShippingZones(zones => zones.map(zone => 
          zone.id === activeZone.id ? { ...zone, ...zoneFormData } as ShippingZone : zone
        ));
      } else {
        // Add new zone
        const newZone: ShippingZone = {
          id: Date.now().toString(), // Simple ID generation
          name: zoneFormData.name || '',
          countries: zoneFormData.countries || [],
          isActive: zoneFormData.isActive || false,
          description: zoneFormData.description
        };
        setShippingZones(zones => [...zones, newZone]);
      }
      
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save shipping zone:', err);
      setError('Failed to save shipping zone. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Group settings by category for better organization - using real settings if available, or dummy data otherwise
  const generalSettings = settings.filter(s => s.key?.startsWith('shipping.general')).length > 0 
    ? settings.filter(s => s.key?.startsWith('shipping.general'))
    : dummyGeneralSettings;
    
  const fulfillmentSettings = settings.filter(s => s.key?.startsWith('shipping.fulfillment')).length > 0
    ? settings.filter(s => s.key?.startsWith('shipping.fulfillment'))
    : dummyFulfillmentSettings;
    
  const packagingSettings = settings.filter(s => s.key?.startsWith('shipping.packaging')).length > 0
    ? settings.filter(s => s.key?.startsWith('shipping.packaging'))
    : dummyPackagingSettings;
    
  const carrierSettings = settings.filter(s => s.key?.startsWith('shipping.carriers')).length > 0
    ? settings.filter(s => s.key?.startsWith('shipping.carriers'))
    : dummyCarrierSettings;
  
  // Load shipping settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const shippingSettingsDomain = await new SettingsService().getDomainByNameWithSettings('shipping');
        setSettings(shippingSettingsDomain.settings);
        
        // In a real implementation, you would load shipping zones and methods from the API
        // For this example, we're already using the dummy data defined at the top
      } catch (err) {
        console.error('Failed to load shipping settings:', err);
        setError('Failed to load shipping settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Handle zone form input changes
  const handleZoneFormChange = (field: keyof ShippingZone, value: any) => {
    setZoneFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading shipping settings...</Typography>
      </Box>
    );
  }
  
  // Render error state
  if (error && !dialogOpen) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  // Main render
  return (
    <Box sx={{ p: 2 }}>
    <Typography variant="h4" sx={{ mb: 4 }}>Shipping & Fulfillment Settings</Typography>
    <Typography sx={{ mb: 4 }}>Configure shipping zones, methods, and fulfillment options for your store.</Typography>

    <Tabs
      value={tabValue}
      onChange={handleTabChange}
      textColor="primary"
      indicatorColor="primary"
      aria-label="shipping settings tabs"
      sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
    >
      <Tab label="Zones" icon={<MapIcon />} iconPosition="start" id="shipping-tab-0" aria-controls="shipping-tabpanel-0" />
      <Tab label="Methods" icon={<TruckIcon />} iconPosition="start" id="shipping-tab-1" aria-controls="shipping-tabpanel-1" />
      <Tab label="General" icon={<SettingsIcon />} iconPosition="start" id="shipping-tab-2" aria-controls="shipping-tabpanel-2" />
      <Tab label="Carriers" icon={<TruckIcon />} iconPosition="start" id="shipping-tab-3" aria-controls="shipping-tabpanel-3" />
      <Tab label="Packaging" icon={<PackageIcon />} iconPosition="start" id="shipping-tab-4" aria-controls="shipping-tabpanel-4" />
      <Tab label="Fulfillment" icon={<PackageIcon />} iconPosition="start" id="shipping-tab-5" aria-controls="shipping-tabpanel-5" />
    </Tabs>

    {/* Tab Panel Content */}
    <TabPanel value={tabValue} index={0}>
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardHeader
          title="Shipping Zones"
          action={
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={openNewZoneForm}
            >
              Add Zone
            </Button>
          }
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Zone Name</TableCell>
                <TableCell>Countries</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shippingZones.map((zone) => (
                <TableRow
                  key={zone.id}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    opacity: zone.isActive ? 1 : 0.6,
                  }}
                >
                  <TableCell component="th" scope="row">
                    {zone.name}
                  </TableCell>
                  <TableCell>{zone.countries.join(', ')}</TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={zone.isActive}
                      onChange={() => toggleZoneActive(zone.id)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => openZoneDetails(zone)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteZone(zone.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabPanel>
    
    <TabPanel value={tabValue} index={1}>
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardHeader
          title="Shipping Methods"
          action={
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={addShippingMethod}
            >
              Add Method
            </Button>
          }
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Method Name</TableCell>
                <TableCell>Zone</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Calculation</TableCell>
                <TableCell>Delivery Time</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shippingMethods.map((method) => {
                const zone = shippingZones.find(z => z.id === method.zoneId);
                return (
                  <TableRow
                    key={method.id}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      opacity: method.isActive ? 1 : 0.6,
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {method.name}
                    </TableCell>
                    <TableCell>{zone?.name || 'Global'}</TableCell>
                    <TableCell>${method.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {method.calculationType === 'flat_rate' ? 'Flat Rate' : 
                       method.calculationType === 'weight_based' ? 'Weight Based' : 
                       'Price Based'}
                    </TableCell>
                    <TableCell>{method.estimatedDelivery}</TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={method.isActive}
                        onChange={() => toggleMethodActive(method.id)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          // Edit method would be implemented here
                          onClick={() => window.alert('Edit method: ' + method.name)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteShippingMethod(method.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabPanel>

    <TabPanel value={tabValue} index={2}>
      <Card variant="outlined">
        <CardHeader title="General Shipping Settings" />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Setting</TableCell>
                <TableCell>Value</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {generalSettings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>{setting.key.replace('shipping.general.', '')}</TableCell>
                  <TableCell>{setting.value}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabPanel>

    <TabPanel value={tabValue} index={3}>
      <Card variant="outlined">
        <CardHeader title="Carrier Settings" />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Carrier</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carrierSettings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>{setting.key.replace('shipping.carriers.', '')}</TableCell>
                  <TableCell>
                    <Switch checked={setting.value === 'true'} color="primary" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabPanel>

    <TabPanel value={tabValue} index={4}>
      <Card variant="outlined">
        <CardHeader title="Packaging Settings" />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Setting</TableCell>
                <TableCell>Value</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packagingSettings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>{setting.key.replace('shipping.packaging.', '')}</TableCell>
                  <TableCell>{setting.value}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabPanel>

    <TabPanel value={tabValue} index={5}>
      <Card variant="outlined">
        <CardHeader title="Fulfillment Settings" />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Setting</TableCell>
                <TableCell>Value</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fulfillmentSettings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>{setting.key.replace('shipping.fulfillment.', '')}</TableCell>
                  <TableCell>
                    <Switch checked={setting.value === 'true'} color="primary" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabPanel>

    {/* Zone Details Modal */}
    <Dialog 
      open={dialogOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {activeZone ? `Edit ${activeZone.name} Zone` : 'New Shipping Zone'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
          
        {/* Zone Form */}
        <Typography variant="h6" sx={{ mb: 2 }}>Zone Information</Typography>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Name Field */}
          <TextField
            label="Zone Name"
            required
            placeholder="e.g. North America"
            value={zoneFormData.name || ''}
            onChange={(e) => setZoneFormData({...zoneFormData, name: e.target.value})}
            fullWidth
          />
            
          {/* Description Field */}
          <TextField
            label="Description"
            placeholder="Zone description"
            value={zoneFormData.description || ''}
            onChange={(e) => setZoneFormData({...zoneFormData, description: e.target.value})}
            multiline
            rows={2}
            fullWidth
          />
            
          {/* Countries Field */}
          <TextField
            label="Countries"
            required
            placeholder="Enter country codes separated by commas (e.g. US, CA, MX)"
            value={zoneFormData.countries?.join(', ') || ''}
            onChange={(e) => {
              const countryCodes = e.target.value
                .split(',')
                .map(code => code.trim())
                .filter(Boolean);
              setZoneFormData({...zoneFormData, countries: countryCodes});
            }}
            helperText="Enter country codes separated by commas"
            multiline
            rows={2}
            fullWidth
          />
            
          {/* Active Status */}
          <FormControlLabel
            control={
              <Switch 
                checked={zoneFormData.isActive || false}
                onChange={(e) => setZoneFormData({...zoneFormData, isActive: e.target.checked})}
                color="primary"
              />
            }
            label="Active"
          />
        </Stack>
      </DialogContent>
        
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
          onClick={handleSaveZone}
        >
          Save Zone
        </Button>
      </DialogActions>
    </Dialog>
  </Box>
);
};

export default ShippingSettings;
