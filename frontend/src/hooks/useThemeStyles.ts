import * as React from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';import { Button } from '@mui/material';
import { Card } from '@/components/ui/card';
import { Product } from '@/types/product';import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * A hook to generate component-specific styles based on the current theme
 * This creates a bridge between the theme context and individual components
 */
export function useThemeStyles() {
  const { theme } = useTheme();
  
  // Memoize the styles to prevent unnecessary recalculations
  return useMemo(() => {
    // Button styles
    const button = {
      primary: {
        className: 'rounded-md transition-colors',
        style: {
          backgroundColor: theme.colors.primary,
          color: theme.componentStyles.button.primary.text,
          border: theme.componentStyles.button.primary.border,
          borderRadius: theme.componentStyles.button.primary.borderRadius,
          padding: theme.componentStyles.button.primary.padding,
        },
        hoverStyle: {
          backgroundColor: theme.componentStyles.button.primary.hoverBackground,
          color: theme.componentStyles.button.primary.hoverText,
          border: theme.componentStyles.button.primary.hoverBorder,
        },
      },
      secondary: {
        className: 'rounded-md transition-colors',
        style: {
          backgroundColor: theme.componentStyles.button.secondary.background,
          color: theme.componentStyles.button.secondary.text,
          border: theme.componentStyles.button.secondary.border,
          borderRadius: theme.componentStyles.button.secondary.borderRadius,
          padding: theme.componentStyles.button.secondary.padding,
        },
        hoverStyle: {
          backgroundColor: theme.componentStyles.button.secondary.hoverBackground,
          color: theme.componentStyles.button.secondary.hoverText,
          border: theme.componentStyles.button.secondary.hoverBorder,
        },
      },
    };

    // Card styles
    const card = {
      className: 'overflow-hidden',
      style: {
        backgroundColor: theme.componentStyles.card.background,
        color: theme.componentStyles.card.text,
        border: theme.componentStyles.card.border,
        borderRadius: theme.componentStyles.card.borderRadius,
        boxShadow: theme.componentStyles.card.shadow,
        padding: theme.componentStyles.card.padding,
      },
    };

    // Form styles
    const form = {
      input: {
        className: 'w-full',
        style: {
          backgroundColor: theme.componentStyles.form.input.background,
          color: theme.componentStyles.form.input.text,
          border: theme.componentStyles.form.input.border,
          borderRadius: theme.componentStyles.form.input.borderRadius,
          padding: theme.componentStyles.form.input.padding,
        },
        focusStyle: {
          borderColor: theme.componentStyles.form.input.focusBorder,
          outline: 'none',
          boxShadow: `0 0 0 2px ${theme.colors.primary}25`,
        },
      },
      label: {
        className: 'block',
        style: {
          color: theme.componentStyles.form.label.text,
          fontSize: theme.componentStyles.form.label.fontSize,
          marginBottom: theme.componentStyles.form.label.marginBottom,
        },
      },
    };

    // Navigation styles
    const navigation = {
      className: 'flex',
      style: {
        backgroundColor: theme.componentStyles.navigation.background,
        color: theme.componentStyles.navigation.text,
      },
      linkStyle: {
        color: theme.componentStyles.navigation.text,
      },
      activeLinkStyle: {
        color: theme.componentStyles.navigation.activeText,
        borderBottom: theme.componentStyles.navigation.borderBottom,
      },
      hoverLinkStyle: {
        color: theme.componentStyles.navigation.hoverText,
      },
    };

    // Product card styles specifically for the ProductCard component
    const productCard = {
      className: 'h-full transition-all duration-200',
      style: {
        backgroundColor: theme.componentStyles.card.background,
        color: theme.componentStyles.card.text,
        border: theme.componentStyles.card.border,
        borderRadius: theme.componentStyles.card.borderRadius,
        boxShadow: theme.componentStyles.card.shadow,
        overflow: 'hidden',
      },
      hoverStyle: {
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        transform: 'translateY(-4px)',
      },
      imageContainer: {
        className: 'relative overflow-hidden',
        style: {
          aspectRatio: '1/1',
        },
      },
      content: {
        className: 'p-4',
      },
      title: {
        className: 'font-medium',
        style: {
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily.heading,
          fontSize: theme.typography.fontSize.lg,
        },
      },
      price: {
        className: 'font-bold',
        style: {
          color: theme.colors.primary,
          fontSize: theme.typography.fontSize.xl,
        },
      },
      description: {
        className: 'mt-2',
        style: {
          color: theme.colors.secondary,
          fontSize: theme.typography.fontSize.sm,
        },
      },
      badge: {
        className: 'absolute top-2 right-2 px-2 py-1 text-xs rounded',
        style: {
          backgroundColor: theme.colors.accent,
          color: 'white',
        },
      },
    };

    return {
      button,
      card,
      form,
      navigation,
      productCard,
      // Global styles
      global: {
        body: {
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily.body,
        },
        heading: {
          fontFamily: theme.typography.fontFamily.heading,
          color: theme.colors.text,
        },
      },
    };
  }, [theme]);
}
