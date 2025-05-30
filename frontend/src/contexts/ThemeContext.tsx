import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '../types/theme';
import { useTenant } from './TenantContext';
import { defaultTheme } from '../utils/defaultTheme';

interface ThemeContextType {
  theme: Theme;
  isLoading: boolean;
  error: Error | null;
  previewTheme: Theme | null;
  setTheme: (theme: Theme) => void;
  setPreviewTheme: (theme: Theme | null) => void;
  clearPreviewTheme: () => void;
  availableThemes?: Theme[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  isLoading: true,
  error: null,
  previewTheme: null,
  setTheme: () => {},
  setPreviewTheme: () => {},
  clearPreviewTheme: () => {},
  availableThemes: [],
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check for theme preview in cookies
  useEffect(() => {
    const previewCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('theme_preview='));
    
    if (previewCookie) {
      try {
        const previewData = JSON.parse(decodeURIComponent(previewCookie.split('=')[1]));
        setPreviewTheme(previewData);
      } catch (e) {
        console.error('Failed to parse theme preview cookie:', e);
      }
    }
  }, []);

  const clearPreviewTheme = () => {
    setPreviewTheme(null);
    // Remove the preview cookie
    document.cookie = 'theme_preview=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  };

  // Fetch tenant theme when tenant changes
  useEffect(() => {
    if (isTenantLoading) return;
    if (!tenant) {
      setIsLoading(false);
      return;
    }

    const fetchTheme = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tenants/${tenant.id}/theme`);
        
        if (!response.ok) {
          throw new Error(`Failed to load theme: ${response.statusText}`);
        }
        
        const themeData = await response.json();
        setTheme(themeData);
      } catch (err) {
        console.error('Error fetching theme:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching theme'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTheme();
  }, [tenant, isTenantLoading]);

  // The actual theme is either the preview theme (if set) or the tenant's theme
  const activeTheme = previewTheme || theme;

  // Mock available themes for now - in a real implementation, these would be fetched from an API
  const availableThemes: Theme[] = [
    defaultTheme,
    {
      id: 'dark',
      name: 'Dark Mode',
      description: 'A dark theme for low light environments',
      colors: {
        primary: '#3B82F6',
        secondary: '#6366F1',
        accent: '#EC4899',
        background: '#111827',
        text: '#F9FAFB',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      typography: { ...defaultTheme.typography },
      layout: { ...defaultTheme.layout },
      componentStyles: { ...defaultTheme.componentStyles }
    },
    {
      id: 'light',
      name: 'Light Mode',
      description: 'A light theme for standard usage',
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#EC4899',
        background: '#F9FAFB',
        text: '#111827',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      typography: { ...defaultTheme.typography },
      layout: { ...defaultTheme.layout },
      componentStyles: { ...defaultTheme.componentStyles }
    }
  ];

  return (
    <ThemeContext.Provider 
      value={{ 
        theme: activeTheme, 
        isLoading, 
        error, 
        previewTheme, 
        setTheme,
        setPreviewTheme,
        clearPreviewTheme,
        availableThemes
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
