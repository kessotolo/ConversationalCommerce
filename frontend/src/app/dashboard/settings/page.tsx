'use client';

import { CreditCard, Bell, MessageSquare, Upload, Trash2, Save, Store } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import type { StoreSettings } from '@/modules/storefront/models/storeSettings';

import type { InputChangeEvent } from '@/modules/core/models';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function SettingsPage() {
  const [store, setStore] = useState<StoreSettings>({
    logo: null,
    storeName: '',
    email: '',
    phone: '',
    currency: 'NGN',
    storeDescription: '',
    address: '',
    businessHours: {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '10:00', close: '16:00', isOpen: false },
      sunday: { open: '10:00', close: '16:00', isOpen: false },
    },
    whatsappNumber: '',
    whatsappBusinessId: '',
    paymentMethods: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shippingPlugins, setShippingPlugins] = useState<string[]>([]);
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>([]);
  const [pluginError, setPluginError] = useState<string | null>(null);
  const [pluginSuccess, setPluginSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available shipping plugins from backend
    fetch('/api/v1/shipping/providers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.providers)) {
          setShippingPlugins(data.providers);
          // For demo, enable all by default
          setEnabledPlugins(data.providers);
        }
      })
      .catch(() => setPluginError('Failed to load shipping providers'));
  }, []);

  const handleTogglePlugin = (provider: string) => {
    setEnabledPlugins((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider],
    );
    setPluginSuccess(
      `Plugin ${provider} ${enabledPlugins.includes(provider) ? 'disabled' : 'enabled'}`,
    );
    setTimeout(() => setPluginSuccess(null), 2000);
  };

  // Mock save settings with API integration structure
  const saveSettings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // This is where you would make a real API call
      // const response = await storeService.updateSettings(store);

      // Simulate API call
      setTimeout(() => {
        setSuccessMessage('Store settings saved successfully!');
        setIsLoading(false);

        // Auto hide success message
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to save settings');
      }
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: InputChangeEvent) => {
    const { name, value } = e.target;
    setStore({
      ...store,
      [name]: value,
    });
  };

  // Handle business hours change
  const handleHoursChange = (
    day: string,
    field: 'open' | 'close' | 'isOpen',
    value: string | boolean,
  ) => {
    setStore((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          open: field === 'open' ? (value as string) : prev.businessHours[day]?.open ?? '',
          close: field === 'close' ? (value as string) : prev.businessHours[day]?.close ?? '',
          isOpen: field === 'isOpen' ? (value as boolean) : prev.businessHours[day]?.isOpen ?? false,
        },
      },
    }));
  };

  // Use useEffect to fetch templates from TemplateService
  // Add loading, error, and empty states as needed

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Store Settings</h1>
        <p className="text-gray-500">Manage your store preferences and configuration</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          <p>{successMessage}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Store Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="mr-2 h-5 w-5" />
              Store Information
            </CardTitle>
            <CardDescription>Basic information about your store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
                <div className="relative h-24 w-24 rounded-md overflow-hidden bg-gray-200">
                  {store.logo ? (
                    <Image src={store.logo} alt="Store Logo" fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400">
                      No Logo
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button className="flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  {store.logo && (
                    <Button className="flex items-center text-red-500 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="storeName">
                    Store Name
                  </label>
                  <input
                    id="storeName"
                    name="storeName"
                    type="text"
                    className="w-full p-2 border rounded-md"
                    value={store.storeName}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="w-full p-2 border rounded-md"
                    value={store.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="w-full p-2 border rounded-md"
                    value={store.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="currency">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    className="w-full p-2 border rounded-md"
                    value={store.currency}
                    onChange={handleInputChange}
                  >
                    <option value="NGN">Nigerian Naira (NGN)</option>
                    <option value="KES">Kenyan Shilling (KES)</option>
                    <option value="GHS">Ghanaian Cedi (GHS)</option>
                    <option value="ZAR">South African Rand (ZAR)</option>
                    <option value="USD">US Dollar (USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="storeDescription">
                  Store Description
                </label>
                <textarea
                  id="storeDescription"
                  name="storeDescription"
                  rows={3}
                  className="w-full p-2 border rounded-md"
                  value={store.storeDescription}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="address">
                  Business Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={store.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Business Hours
            </CardTitle>
            <CardDescription>Set your store's operating hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(store.businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-2">
                  <div className="w-24 font-medium capitalize">{day}</div>
                  <div className="flex-1 flex items-center">
                    <input
                      type="checkbox"
                      id={`${day}-open`}
                      checked={hours.isOpen}
                      onChange={(e) => handleHoursChange(day, 'isOpen', e.target.checked)}
                      className="mr-2"
                    />
                    {hours.isOpen ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          className="p-1 border rounded-md text-sm"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                          className="p-1 border rounded-md text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Closed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              WhatsApp Integration
            </CardTitle>
            <CardDescription>Configure your WhatsApp Business account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="whatsappNumber">
                  WhatsApp Number
                </label>
                <input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  type="tel"
                  className="w-full p-2 border rounded-md"
                  value={store.whatsappNumber}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="whatsappBusinessId">
                  WhatsApp Business ID
                </label>
                <input
                  id="whatsappBusinessId"
                  name="whatsappBusinessId"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={store.whatsappBusinessId}
                  onChange={handleInputChange}
                />
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Message Templates</h3>
                <div className="space-y-2">
                  {/* Use useEffect to fetch templates from TemplateService */}
                  {/* Add loading, error, and empty states as needed */}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Configure how you receive payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="mobile-money"
                    checked={store.paymentMethods.includes('Mobile Money')}
                    className="mr-3"
                  />
                  <label htmlFor="mobile-money" className="font-medium">
                    Mobile Money
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="cash-delivery"
                    checked={store.paymentMethods.includes('Cash on Delivery')}
                    className="mr-3"
                  />
                  <label htmlFor="cash-delivery" className="font-medium">
                    Cash on Delivery
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="bank-transfer"
                    checked={store.paymentMethods.includes('Bank Transfer')}
                    className="mr-3"
                  />
                  <label htmlFor="bank-transfer" className="font-medium">
                    Bank Transfer
                  </label>
                </div>
              </div>
              <Button className="w-full mt-2">Add Payment Method</Button>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Plugins Management */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Shipping Plugins</CardTitle>
            <CardDescription>Enable or disable shipping providers for your store</CardDescription>
          </CardHeader>
          <CardContent>
            {pluginError && (
              <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{pluginError}</div>
            )}
            {pluginSuccess && (
              <div className="mb-2 p-2 bg-green-100 text-green-700 rounded">{pluginSuccess}</div>
            )}
            <ul className="space-y-2">
              {shippingPlugins.map((provider) => (
                <li key={provider} className="flex items-center justify-between">
                  <span>{provider}</span>
                  <Button
                    size="sm"
                    variant={enabledPlugins.includes(provider) ? 'default' : 'outline'}
                    onClick={() => handleTogglePlugin(provider)}
                  >
                    {enabledPlugins.includes(provider) ? 'Enabled' : 'Enable'}
                  </Button>
                </li>
              ))}
              {shippingPlugins.length === 0 && <li>No shipping providers found.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button className="mr-2">Cancel</Button>
        <Button onClick={saveSettings} disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
