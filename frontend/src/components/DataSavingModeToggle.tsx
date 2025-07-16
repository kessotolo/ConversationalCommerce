"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

type DataSavingMode = 'off' | 'low' | 'high';

interface DataSavingModeToggleProps {
  position?: 'bottom-bar' | 'inline' | 'settings';
  onChange?: (mode: DataSavingMode) => void;
}

export function DataSavingModeToggle({
  position = 'inline',
  onChange
}: DataSavingModeToggleProps) {
  const [mode, setMode] = useState<DataSavingMode>('off');
  const { toast } = useToast();

  // Load saved preference
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('dataSavingMode') as DataSavingMode;
      if (savedMode && ['off', 'low', 'high'].includes(savedMode)) {
        setMode(savedMode);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  const handleModeChange = (newMode: DataSavingMode) => {
    setMode(newMode);

    // Save to localStorage
    try {
      localStorage.setItem('dataSavingMode', newMode);
    } catch (e) {
      // Ignore storage errors
    }

    // Notify parent
    onChange?.(newMode);

    // Show toast
    const messages = {
      'off': 'Data saving mode disabled',
      'low': 'Low data saving mode enabled',
      'high': 'High data saving mode enabled'
    };

    toast({
      title: "Data Saving Mode",
      description: messages[newMode],
    });
  };

  const getModeIcon = (currentMode: DataSavingMode) => {
    switch (currentMode) {
      case 'off': return <Wifi className="h-4 w-4" />;
      case 'low': return <Signal className="h-4 w-4" />;
      case 'high': return <WifiOff className="h-4 w-4" />;
    }
  };

  const getModeDescription = (currentMode: DataSavingMode) => {
    switch (currentMode) {
      case 'off': return 'Normal data usage';
      case 'low': return 'Reduced image quality, limited animations';
      case 'high': return 'Text only, no images or animations';
    }
  };

  if (position === 'bottom-bar') {
    return (
      <div className="fixed bottom-16 left-4 z-40 bg-white rounded-lg shadow-lg border p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getModeIcon(mode)}
            <span className="text-sm font-medium">Data Saving</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={mode === 'off' ? 'default' : 'outline'}
              onClick={() => handleModeChange('off')}
              className="h-6 px-2 text-xs"
            >
              Off
            </Button>
            <Button
              size="sm"
              variant={mode === 'low' ? 'default' : 'outline'}
              onClick={() => handleModeChange('low')}
              className="h-6 px-2 text-xs"
            >
              Low
            </Button>
            <Button
              size="sm"
              variant={mode === 'high' ? 'default' : 'outline'}
              onClick={() => handleModeChange('high')}
              className="h-6 px-2 text-xs"
            >
              High
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (position === 'settings') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Data Saving Mode</Label>
            <p className="text-sm text-muted-foreground">
              {getModeDescription(mode)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={mode === 'off' ? 'default' : 'outline'}
              onClick={() => handleModeChange('off')}
            >
              Off
            </Button>
            <Button
              size="sm"
              variant={mode === 'low' ? 'default' : 'outline'}
              onClick={() => handleModeChange('low')}
            >
              Low
            </Button>
            <Button
              size="sm"
              variant={mode === 'high' ? 'default' : 'outline'}
              onClick={() => handleModeChange('high')}
            >
              High
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default inline position
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        {getModeIcon(mode)}
        <span className="text-sm font-medium">Data Saving</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'off' ? 'default' : 'outline'}
          onClick={() => handleModeChange('off')}
        >
          Off
        </Button>
        <Button
          size="sm"
          variant={mode === 'low' ? 'default' : 'outline'}
          onClick={() => handleModeChange('low')}
        >
          Low
        </Button>
        <Button
          size="sm"
          variant={mode === 'high' ? 'default' : 'outline'}
          onClick={() => handleModeChange('high')}
        >
          High
        </Button>
      </div>
    </div>
  );
}
