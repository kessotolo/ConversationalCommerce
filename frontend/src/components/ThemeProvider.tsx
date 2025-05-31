import { CustomThemeProvider, ThemeProviderProps } from '@/components/ThemeProvider';
import { TenantContext } from '@/contexts/TenantContext';
import { ThemeContext } from '@/contexts/ThemeContext';
import { FC, ReactNode } from 'react';import * as React from 'react';
import { TenantProvider } from '../contexts/TenantContext';
import { ThemeProvider as CustomThemeProvider } from '../contexts/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Root provider that combines tenant and theme providers
 * This should wrap your application to provide theme context
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <TenantProvider>
      <CustomThemeProvider>
        {children}
      </CustomThemeProvider>
    </TenantProvider>
  );
};
