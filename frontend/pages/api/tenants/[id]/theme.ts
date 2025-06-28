// import type { Theme } from '@/modules/theme/models/theme';
// TODO: Fix Theme type import. Using 'any' for now.
type Theme = any;

import type { NextApiRequest, NextApiResponse } from 'next';

type ErrorResponse = {
  error: string;
};

/**
 * API endpoint to get a tenant's theme by tenant ID
 *
 * This endpoint fetches theme data from the backend based on the tenant ID
 * It's used by the ThemeContext to load the appropriate theme
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Theme | ErrorResponse>,
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid tenant ID parameter' });
  }

  try {
    // Use real backend API to fetch theme by tenant ID
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/${id}/theme`);
    // const data = await response.json();

    // For demo purposes, we'll mock the theme data
    // Replace this with an actual API call to your backend that fetches the StorefrontTheme

    // Base theme that all tenant themes derive from
    const baseTheme: Theme = {
      id: 'default',
      name: 'Default Theme',
      description: 'Default theme used as fallback',
      created_at: new Date().toISOString(),
      colors: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        accent: '#8b5cf6',
        background: '#ffffff',
        text: '#1f2937',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      typography: {
        fontFamily: {
          heading: 'Inter, system-ui, sans-serif',
          body: 'Inter, system-ui, sans-serif',
        },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
        },
        fontWeight: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800,
        },
        lineHeight: {
          none: '1',
          tight: '1.25',
          normal: '1.5',
          relaxed: '1.75',
          loose: '2',
        },
      },
      layout: {
        spacing: {
          xs: '0.5rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem',
          '2xl': '4rem',
          '3xl': '6rem',
        },
        borderRadius: {
          none: '0',
          sm: '0.125rem',
          md: '0.375rem',
          lg: '0.5rem',
          full: '9999px',
        },
        breakpoints: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
        maxWidth: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
          full: '100%',
        },
      },
      componentStyles: {
        button: {
          primary: {
            background: '#3b82f6',
            text: '#ffffff',
            border: 'none',
            hoverBackground: '#2563eb',
            hoverText: '#ffffff',
            hoverBorder: 'none',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
          },
          secondary: {
            background: 'transparent',
            text: '#3b82f6',
            border: '1px solid #3b82f6',
            hoverBackground: '#eff6ff',
            hoverText: '#2563eb',
            hoverBorder: '1px solid #2563eb',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
          },
        },
        card: {
          background: '#ffffff',
          text: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '1.5rem',
        },
        form: {
          input: {
            background: '#ffffff',
            text: '#1f2937',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            padding: '0.5rem 0.75rem',
            focusBorder: '#3b82f6',
          },
          label: {
            text: '#4b5563',
            fontSize: '0.875rem',
            marginBottom: '0.5rem',
          },
        },
        navigation: {
          background: '#ffffff',
          text: '#4b5563',
          activeText: '#3b82f6',
          hoverText: '#2563eb',
          borderBottom: '2px solid #3b82f6',
        },
      },
    };

    const theme = baseTheme;
    return res.status(200).json(theme);
  } catch (error) {
    console.error('Error fetching theme:', error);
    return res.status(500).json({ error: 'Failed to fetch theme data' });
  }
}
