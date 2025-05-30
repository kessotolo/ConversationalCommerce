import React from 'react';
import { ThemeProvider } from '../../../src/components/ThemeProvider';
import StorefrontLinks from '../../../src/components/dashboard/StorefrontLinks';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Palette, Layout, Type, Navigation, Image, Settings } from 'lucide-react';
import Link from 'next/link';

// Layout component to use theme context
function StorefrontCustomizeContent() {
  const { theme, isLoading } = useTheme();
  
  if (isLoading) {
    return <div className="p-6">Loading theme information...</div>;
  }

  // Customization options
  const customizationOptions = [
    {
      title: 'Theme Settings',
      description: 'Change colors, fonts, and overall appearance',
      icon: <Palette size={24} />,
      href: '/dashboard/storefront/theme'
    },
    {
      title: 'Layout',
      description: 'Modify page layouts and section arrangement',
      icon: <Layout size={24} />,
      href: '/dashboard/storefront/layout'
    },
    {
      title: 'Typography',
      description: 'Customize fonts, sizes, and text styles',
      icon: <Type size={24} />,
      href: '/dashboard/storefront/typography'
    },
    {
      title: 'Navigation',
      description: 'Edit menus, links, and navigation structure',
      icon: <Navigation size={24} />,
      href: '/dashboard/storefront/navigation'
    },
    {
      title: 'Images & Media',
      description: 'Update logos, banners, and product images',
      icon: <Image size={24} />,
      href: '/dashboard/storefront/media'
    },
    {
      title: 'Advanced Settings',
      description: 'Configure SEO, analytics, and technical options',
      icon: <Settings size={24} />,
      href: '/dashboard/storefront/settings'
    }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customize Storefront</h1>
        
        <Link
          href={`https://${theme.subdomain || 'default'}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'yourplatform.com'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <span>View Live Site</span>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Links */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <StorefrontLinks />
          </div>
        </div>
        
        {/* Right column - Customization options */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Customization Options</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customizationOptions.map((option, index) => (
                <Link
                  key={index}
                  href={option.href}
                  className="flex items-start p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="mr-4 text-blue-600">
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{option.title}</h3>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Current Theme Preview</h2>
            
            <div 
              className="border rounded-lg p-4 overflow-hidden"
              style={{ 
                backgroundColor: theme.colors.background,
                color: theme.colors.text
              }}
            >
              <div 
                className="h-16 mb-4 rounded" 
                style={{ 
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: theme.typography.fontFamily.heading,
                  fontWeight: theme.typography.fontWeight.bold
                }}
              >
                Header Area
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <button
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.componentStyles.button.primary.text,
                    border: theme.componentStyles.button.primary.border,
                    borderRadius: theme.componentStyles.button.primary.borderRadius,
                    padding: theme.componentStyles.button.primary.padding,
                  }}
                >
                  Primary Button
                </button>
                
                <button
                  style={{
                    backgroundColor: theme.componentStyles.button.secondary.background,
                    color: theme.componentStyles.button.secondary.text,
                    border: theme.componentStyles.button.secondary.border,
                    borderRadius: theme.componentStyles.button.secondary.borderRadius,
                    padding: theme.componentStyles.button.secondary.padding,
                  }}
                >
                  Secondary Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap page with ThemeProvider
export default function StorefrontCustomizePage() {
  return (
    <ThemeProvider>
      <StorefrontCustomizeContent />
    </ThemeProvider>
  );
}
