import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../services/SettingsService';
import { Setting } from '../../models/settings';
import SettingsForm from '../SettingsForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

const StoreSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const settingsService = new SettingsService();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const storeSettings = await settingsService.getSettingsByDomain('store');
        setSettings(storeSettings);
      } catch (err) {
        console.error('Failed to load store settings:', err);
        setError('Failed to load store settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaved = () => {
    // Optionally reload settings or show success message
    console.log('Store settings saved successfully');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <SettingsForm
      domainName="store"
      settings={settings}
      title="Store Settings"
      description="Configure your store information, appearance, and basic settings."
      onSaved={handleSaved}
    />
  );
};

export default StoreSettings;
