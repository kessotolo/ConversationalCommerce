import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Truck,
  Package,
  MapPin,
  Settings as SettingsIcon
} from 'lucide-react';
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
        <div className="pt-6">
          {children}
        </div>
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
  const handleTabChange = (newValue: string) => {
    setTabValue(parseInt(newValue));
  };

  // Dialog handlers
  const onClose = () => {
    setDialogOpen(false);
    setActiveZone(null);
    setError(null);
  };

  // Zone handlers
  const openNewZoneForm = () => {
    setActiveZone(null);
    setZoneFormData({
      id: '',
      name: '',
      countries: [],
      isActive: true,
      description: ''
    });
    setDialogOpen(true);
  };

  const openZoneDetails = (zone: ShippingZone) => {
    setActiveZone(zone);
    setZoneFormData(zone);
    setDialogOpen(true);
  };

  const toggleZoneActive = (zoneId: string) => {
    setShippingZones(prev => prev.map(zone =>
      zone.id === zoneId ? { ...zone, isActive: !zone.isActive } : zone
    ));
  };

  const deleteZone = (zoneId: string) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      setShippingZones(prev => prev.filter(zone => zone.id !== zoneId));
    }
  };

  // Method handlers
  const toggleMethodActive = (methodId: string) => {
    setShippingMethods(prev => prev.map(method =>
      method.id === methodId ? { ...method, isActive: !method.isActive } : method
    ));
  };

  const addShippingMethod = () => {
    // Implementation for adding shipping method
    window.alert('Add shipping method functionality would be implemented here');
  };

  const deleteShippingMethod = (methodId: string) => {
    if (window.confirm('Are you sure you want to delete this shipping method?')) {
      setShippingMethods(prev => prev.filter(method => method.id !== methodId));
    }
  };

  // Save zone form data
  const handleSaveZone = () => {
    if (!zoneFormData.name || !zoneFormData.countries || zoneFormData.countries.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeZone) {
        // Update existing zone
        const updatedZone: ShippingZone = {
          id: activeZone.id,
          name: zoneFormData.name || '',
          countries: zoneFormData.countries || [],
          isActive: zoneFormData.isActive || false,
          description: zoneFormData.description || ''
        };
        setShippingZones(prev => prev.map(zone =>
          zone.id === activeZone.id ? updatedZone : zone
        ));
      } else {
        // Create new zone
        const newZone: ShippingZone = {
          id: Date.now().toString(),
          name: zoneFormData.name || '',
          countries: zoneFormData.countries || [],
          isActive: zoneFormData.isActive || false,
          description: zoneFormData.description || ''
        };
        setShippingZones(prev => [...prev, newZone]);
      }

      setDialogOpen(false);
      setActiveZone(null);
      setError(null);
    } catch (error) {
      setError('Failed to save zone. Please try again.');
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
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        <p className="ml-4 text-primary">Loading shipping settings...</p>
      </div>
    );
  }

  // Render error state
  if (error && !dialogOpen) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Shipping & Fulfillment Settings</h2>
      <p className="mb-4">Configure shipping zones, methods, and fulfillment options for your store.</p>

      <Tabs value={tabValue.toString()} onValueChange={handleTabChange} className="border-b-2 border-gray-200">
        <TabsList className="w-full">
          <TabsTrigger value="0" className="w-full">
            <MapPin className="h-4 w-4 mr-2" />
            Zones
          </TabsTrigger>
          <TabsTrigger value="1" className="w-full">
            <Truck className="h-4 w-4 mr-2" />
            Methods
          </TabsTrigger>
          <TabsTrigger value="2" className="w-full">
            <SettingsIcon className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="3" className="w-full">
            <Truck className="h-4 w-4 mr-2" />
            Carriers
          </TabsTrigger>
          <TabsTrigger value="4" className="w-full">
            <Package className="h-4 w-4 mr-2" />
            Packaging
          </TabsTrigger>
          <TabsTrigger value="5" className="w-full">
            <Package className="h-4 w-4 mr-2" />
            Fulfillment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="0">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Shipping Zones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openNewZoneForm}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Zone
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Zone Name</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Countries</th>
                      <th className="border border-gray-200 px-4 py-2 text-center">Active</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingZones.map((zone) => (
                      <tr
                        key={zone.id}
                        className={`${zone.isActive ? '' : 'opacity-50'}`}
                      >
                        <td className="border border-gray-200 px-4 py-2">{zone.name}</td>
                        <td className="border border-gray-200 px-4 py-2">{zone.countries.join(', ')}</td>
                        <td className="border border-gray-200 px-4 py-2 text-center">
                          <Switch
                            checked={zone.isActive}
                            onCheckedChange={() => toggleZoneActive(zone.id)}
                          />
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openZoneDetails(zone)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deleteZone(zone.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="1">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Shipping Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addShippingMethod}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Method
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Method Name</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Zone</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Price</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Calculation</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Delivery Time</th>
                      <th className="border border-gray-200 px-4 py-2 text-center">Active</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingMethods.map((method) => {
                      const zone = shippingZones.find(z => z.id === method.zoneId);
                      return (
                        <tr
                          key={method.id}
                          className={`${method.isActive ? '' : 'opacity-50'}`}
                        >
                          <td className="border border-gray-200 px-4 py-2">{method.name}</td>
                          <td className="border border-gray-200 px-4 py-2">{zone?.name || 'Global'}</td>
                          <td className="border border-gray-200 px-4 py-2">${method.price.toFixed(2)}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            {method.calculationType === 'flat_rate' ? 'Flat Rate' :
                              method.calculationType === 'weight_based' ? 'Weight Based' :
                                'Price Based'}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">{method.estimatedDelivery}</td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            <Switch
                              checked={method.isActive}
                              onCheckedChange={() => toggleMethodActive(method.id)}
                            />
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.alert('Edit method: ' + method.name)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => deleteShippingMethod(method.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="2">
          <Card>
            <CardHeader>
              <CardTitle>General Shipping Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Setting</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Value</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generalSettings.map((setting) => (
                      <tr key={setting.id}>
                        <td className="border border-gray-200 px-4 py-2">{setting.key.replace('shipping.general.', '')}</td>
                        <td className="border border-gray-200 px-4 py-2">{setting.value}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="3">
          <Card>
            <CardHeader>
              <CardTitle>Carrier Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Carrier</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Enabled</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrierSettings.map((setting) => (
                      <tr key={setting.id}>
                        <td className="border border-gray-200 px-4 py-2">{setting.key.replace('shipping.carriers.', '')}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          <Switch checked={setting.value === 'true'} />
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="4">
          <Card>
            <CardHeader>
              <CardTitle>Packaging Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Setting</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Value</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packagingSettings.map((setting) => (
                      <tr key={setting.id}>
                        <td className="border border-gray-200 px-4 py-2">{setting.key.replace('shipping.packaging.', '')}</td>
                        <td className="border border-gray-200 px-4 py-2">{setting.value}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="5">
          <Card>
            <CardHeader>
              <CardTitle>Fulfillment Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Setting</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Value</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fulfillmentSettings.map((setting) => (
                      <tr key={setting.id}>
                        <td className="border border-gray-200 px-4 py-2">{setting.key.replace('shipping.fulfillment.', '')}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          <Switch checked={setting.value === 'true'} />
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zone Details Modal */}
      <Dialog open={dialogOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {activeZone ? `Edit ${activeZone.name} Zone` : 'New Shipping Zone'}
            </DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Zone Name
              </Label>
              <Input
                id="name"
                value={zoneFormData.name || ''}
                onChange={(e) => setZoneFormData({ ...zoneFormData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={zoneFormData.description || ''}
                onChange={(e) => setZoneFormData({ ...zoneFormData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="countries" className="text-right">
                Countries
              </Label>
              <Input
                id="countries"
                placeholder="Enter country codes separated by commas (e.g. US, CA, MX)"
                value={zoneFormData.countries?.join(', ') || ''}
                onChange={(e) => {
                  const countryCodes = e.target.value
                    .split(',')
                    .map((code: string) => code.trim())
                    .filter(Boolean);
                  setZoneFormData({ ...zoneFormData, countries: countryCodes });
                }}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="active" className="text-right">
                Active
              </Label>
              <Switch
                id="active"
                checked={zoneFormData.isActive || false}
                onCheckedChange={(checked) => setZoneFormData({ ...zoneFormData, isActive: checked })}
              />
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              disabled={isSubmitting}
              onClick={handleSaveZone}
            >
              Save Zone
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingSettings;
