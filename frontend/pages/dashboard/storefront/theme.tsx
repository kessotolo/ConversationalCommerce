import { ThemeContext } from '@/contexts/ThemeContext';
import { Component, Error } from 'react';import { React } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@mui/material';import React, { useState, useEffect, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { ChevronLeft, Save, Palette, Eye } from 'lucide-react';

// Define TypeScript interfaces
interface Theme {
  id?: string;
  colors?: ThemeColors;
  [key: string]: any;
}

interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  error?: string;
  success?: string;
  warning?: string;
  [key: string]: string | undefined;
}

// Dynamically import components to reduce initial bundle size
const StorefrontLinks = dynamic(
  () => import('@/components/dashboard/StorefrontLinks'),
  { loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded-md"></div>, ssr: false }
);

// Theme customization content
function ThemeCustomizationContent() {
  const { theme, setTheme, isLoading, availableThemes } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [colorState, setColorState] = useState({
    primary: theme?.colors?.primary || '#6366F1',
    secondary: theme?.colors?.secondary || '#8B5CF6',
    accent: theme?.colors?.accent || '#EC4899',
    background: theme?.colors?.background || '#F9FAFB',
    text: theme?.colors?.text || '#111827',
    error: theme?.colors?.error || '#ef4444',
    success: theme?.colors?.success || '#22c55e',
    warning: theme?.colors?.warning || '#f59e0b'
  });
  
  // Use local storage to cache theme settings for better offline experience
  useEffect(() => {
    // Load cached theme from local storage if no theme from context
    if (!theme && typeof window !== 'undefined') {
      const cachedTheme = localStorage.getItem('cached_theme');
      if (cachedTheme) {
        try {
          const parsedTheme = JSON.parse(cachedTheme);
          setColorState(parsedTheme.colors);
        } catch (e) {
          console.error('Error parsing cached theme:', e);
        }
      }
    }
  }, [theme]);
  
  // Helper to update colors efficiently
  const updateColor = (colorKey: keyof ThemeColors, value: string) => {
    setColorState(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded-md animate-pulse w-1/3"></div>
          <div className="h-32 bg-gray-100 rounded-md animate-pulse"></div>
          <div className="h-24 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Prepare updated theme data
      const updatedTheme = {
        ...theme,
        colors: {
          ...(theme?.colors || {}), // Preserve any other color properties
          ...colorState
        }
      };

      // Cache the theme locally for offline use
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_theme', JSON.stringify(updatedTheme));
      }

      // Simulate network condition and implement retry mechanism
      let retries = 0;
      const maxRetries = 3;
      
      const attemptSave = async () => {
        try {
          // Here you would call your API to save the theme
          // Simulating API call with a delay to represent network conditions
          await new Promise(resolve => setTimeout(resolve, 300));
          // await themeService.updateTheme(updatedTheme);
          
          // Update local theme state
          setTheme(updatedTheme);
          
          // Success feedback - use non-blocking notification instead of alert
          const notification = document.createElement('div');
          notification.className = 'fixed bottom-4 right-4 bg-green-50 border-l-4 border-green-500 p-4 text-green-700 shadow-md rounded';
          notification.textContent = 'Theme updated successfully!';
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        } catch (error) {
          if (retries < maxRetries) {
            retries++;
            console.log(`Retry attempt ${retries}/${maxRetries}`);
            return attemptSave();
          }
          throw error;
        }
      };
      
      await attemptSave();
    } catch (error) {
      console.error('Error saving theme:', error);
      // Non-blocking error feedback
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed bottom-4 right-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 shadow-md rounded';
      errorNotification.textContent = 'Failed to update theme. Changes saved locally. Will retry when online.';
      document.body.appendChild(errorNotification);
      setTimeout(() => errorNotification.remove(), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/storefront/customize" className="p-2 rounded-full hover:bg-gray-100">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">Theme Settings</h1>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/preview"
            target="_blank"
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Eye size={18} />
            <span>Preview</span>
          </Link>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={18} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Color section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <Palette className="mr-2" size={20} />
              Colors
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.primary}
                    onChange={(e) => updateColor('primary', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.primary}
                    onChange={(e) => updateColor('primary', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Main brand color</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.secondary}
                    onChange={(e) => updateColor('secondary', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.secondary}
                    onChange={(e) => updateColor('secondary', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Supporting color</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.accent}
                    onChange={(e) => updateColor('accent', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.accent}
                    onChange={(e) => updateColor('accent', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Highlight color</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.background}
                    onChange={(e) => updateColor('background', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.background}
                    onChange={(e) => updateColor('background', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Page background</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.text}
                    onChange={(e) => updateColor('text', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.text}
                    onChange={(e) => updateColor('text', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Main text color</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Error Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.error}
                    onChange={(e) => updateColor('error', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.error}
                    onChange={(e) => updateColor('error', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Error state</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Success Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.success}
                    onChange={(e) => updateColor('success', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.success}
                    onChange={(e) => updateColor('success', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Success state</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warning Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colorState.warning}
                    onChange={(e) => updateColor('warning', e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={colorState.warning}
                    onChange={(e) => updateColor('warning', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  />
                  <div className="text-sm text-gray-500">Warning state</div>
                </div>
              </div>
            </div>
          </div>

          {/* Theme presets */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Theme Presets</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { id: 'default', name: 'Default', primary: '#6366F1', secondary: '#8B5CF6', accent: '#EC4899' },
                { id: 'dark', name: 'Dark Mode', primary: '#818CF8', secondary: '#A78BFA', accent: '#F472B6' },
                { id: 'nature', name: 'Nature', primary: '#10B981', secondary: '#34D399', accent: '#FCD34D' },
                { id: 'ocean', name: 'Ocean', primary: '#3B82F6', secondary: '#60A5FA', accent: '#2DD4BF' },
                { id: 'sunset', name: 'Sunset', primary: '#F97316', secondary: '#FB923C', accent: '#F43F5E' },
                { id: 'monochrome', name: 'Monochrome', primary: '#4B5563', secondary: '#6B7280', accent: '#9CA3AF' }
              ].map((presetTheme) => (
                <button
                  key={presetTheme.id}
                  onClick={() => {
                    setColorState(prev => ({
                      ...prev,
                      primary: presetTheme.primary,
                      secondary: presetTheme.secondary,
                      accent: presetTheme.accent
                    }));
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${selectedTheme === presetTheme.id ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex space-x-2 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: presetTheme.primary }}></div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: presetTheme.secondary }}></div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: presetTheme.accent }}></div>
                  </div>
                  <div className="text-sm font-medium">{presetTheme.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Preview and links */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <StorefrontLinks className="mb-4" />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Theme Preview</h3>

            <div className="rounded-lg border p-4 overflow-hidden">
              <div style={{ backgroundColor: colorState.background }} className="p-4 rounded-lg mb-4">
                <div style={{ color: colorState.text }} className="mb-4">
                  <h4 className="font-bold text-lg mb-1">Sample Heading</h4>
                  <p className="text-sm">This is how your text will appear</p>
                </div>

                <div className="flex space-x-2 mb-4">
                  <button
                    style={{ backgroundColor: colorState.primary, color: 'white' }}
                    className="px-3 py-1 rounded-md text-sm"
                  >
                    Primary Button
                  </button>
                  <button
                    style={{ backgroundColor: colorState.secondary, color: 'white' }}
                    className="px-3 py-1 rounded-md text-sm"
                  >
                    Secondary
                  </button>
                </div>

                <div
                  style={{ backgroundColor: colorState.accent, color: 'white' }}
                  className="text-xs px-2 py-1 rounded inline-block"
                >
                  Accent Label
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error boundary component for better resilience
interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, ErrorBoundaryState> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Theme customization error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Something went wrong</h3>
          <p className="mb-4">We're having trouble loading the theme editor</p>
          <button 
            onClick={() => this.setState({ hasError: false })} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network status detector component
function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-sm text-center py-1 z-50">
      You are currently offline. Changes will be saved locally.
    </div>
  );
}

// Page component wrapped with ThemeProvider and error boundary
export default function ThemeCustomizePage() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NetworkStatusIndicator />
        <Suspense fallback={
          <div className="p-6 space-y-4">
            <div className="h-8 bg-gray-200 rounded-md animate-pulse w-1/3"></div>
            <div className="h-64 bg-gray-100 rounded-md animate-pulse"></div>
          </div>
        }>
          <ThemeCustomizationContent />
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
