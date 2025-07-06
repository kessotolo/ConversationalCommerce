import React, { createContext, useContext, useEffect, useState } from 'react';

import { useTenant } from '@/contexts/TenantContext';
import type { Tenant } from '@/contexts/TenantContext';
import type { Theme } from '@/modules/theme/models/theme';
import { defaultTheme } from '@/utils/defaultTheme';

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
  setTheme: () => { },
  setPreviewTheme: () => { },
  clearPreviewTheme: () => { },
  availableThemes: [],
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Utility type guard for tenant
function isValidTenant(tenant: Tenant | null): tenant is Tenant {
  return tenant !== null;
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
      .find((row) => row.startsWith('theme_preview='));

    if (previewCookie) {
      try {
        const cookieParts = previewCookie.split('=');
        if (cookieParts.length > 1 && cookieParts[1]) {
          const previewData = JSON.parse(decodeURIComponent(cookieParts[1]));
          setPreviewTheme(previewData);
        }
      } catch (e) {
        console.error('Failed to parse theme preview cookie:', e);
        // Ensure preview theme is cleared in case of error
        setPreviewTheme(null);
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
      if (!isValidTenant(tenant)) {
        setIsLoading(false);
        return;
      }
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

  // Fetch available themes from backend API
  useEffect(() => {
    if (isTenantLoading) return;
    if (!tenant) {
      setIsLoading(false);
      return;
    }

    const fetchThemes = async () => {
      if (!isValidTenant(tenant)) {
        setIsLoading(false);
        return [];
      }
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tenants/${tenant.id}/themes`);

        if (!response.ok) {
          throw new Error(`Failed to load themes: ${response.statusText}`);
        }

        const themesData = await response.json();
        setIsLoading(false);
        return themesData;
      } catch (err) {
        console.error('Error fetching themes:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching themes'));
        setIsLoading(false);
        return [];
      }
    };

    fetchThemes().then((themes) => {
      setIsLoading(false);
      setAvailableThemes(themes);
    });
  }, [tenant, isTenantLoading]);

  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);

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
        availableThemes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
