import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '../types/theme';
import { useTenant } from './TenantContext';
import { defaultTheme } from '../utils/defaultTheme';

interface ThemeContextType {
  theme: Theme;
  isLoading: boolean;
  error: Error | null;
  previewTheme: Theme | null;
  setPreviewTheme: (theme: Theme | null) => void;
  clearPreviewTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  isLoading: true,
  error: null,
  previewTheme: null,
  setPreviewTheme: () => {},
  clearPreviewTheme: () => {},
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

  return (
    <ThemeContext.Provider 
      value={{ 
        theme: activeTheme, 
        isLoading, 
        error, 
        previewTheme, 
        setPreviewTheme,
        clearPreviewTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
