import { Palette, Layout, Type, Navigation, Image, Settings } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useTheme } from '@/contexts/ThemeContext';

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
      href: '/dashboard/storefront/theme',
    },
    {
      title: 'Layout',
      description: 'Modify page layouts and section arrangement',
      icon: <Layout size={24} />,
      href: '/dashboard/storefront/layout',
    },
    {
      title: 'Typography',
      description: 'Customize fonts, sizes, and text styles',
      icon: <Type size={24} />,
      href: '/dashboard/storefront/typography',
    },
    {
      title: 'Navigation',
      description: 'Edit menus, links, and navigation structure',
      icon: <Navigation size={24} />,
      href: '/dashboard/storefront/navigation',
    },
    {
      title: 'Images & Media',
      description: 'Update logos, banners, and product images',
      icon: <Image size={24} />,
      href: '/dashboard/storefront/media',
    },
    {
      title: 'Advanced Settings',
      description: 'Configure SEO, analytics, and technical options',
      icon: <Settings size={24} />,
      href: '/dashboard/storefront/settings',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Customize Storefront</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Customization Options */}
          <div className="md:col-span-2 flex flex-col gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                What would you like to customize?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {customizationOptions.map((option, index) => (
                  <Link
                    key={index}
                    href={option.href}
                    className="group relative flex flex-col items-start p-6 bg-white rounded-2xl shadow-lg border border-[#e6f0eb] hover:shadow-2xl hover:border-[#6C9A8B] transition-all cursor-pointer min-h-[140px]"
                    style={{ minHeight: 140 }}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#e8f6f1] mb-3 group-hover:bg-[#6C9A8B] transition-all">
                      {React.cloneElement(option.icon, { className: 'w-7 h-7', color: '#6C9A8B' })}
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-[#6C9A8B]">
                      {option.title}
                    </h3>
                    <p className="text-gray-500 text-sm">{option.description}</p>
                    <span className="absolute top-4 right-4 text-xs text-[#6C9A8B] opacity-0 group-hover:opacity-100 transition-opacity">
                      Customize
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {/* Live Theme Preview Panel */}
          <aside className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-[#e6f0eb] w-full max-w-xs mx-auto">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Live Theme Preview</h2>
              <div
                className="border rounded-xl p-4 overflow-hidden"
                style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
              >
                <div
                  className="h-12 mb-3 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    fontFamily: theme.typography.fontFamily.heading,
                    fontWeight: theme.typography.fontWeight.bold,
                  }}
                >
                  Storefront Header
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    style={{
                      backgroundColor: theme.colors.primary,
                      color: theme.componentStyles.button.primary.text,
                      border: theme.componentStyles.button.primary.border,
                      borderRadius: theme.componentStyles.button.primary.borderRadius,
                      padding: theme.componentStyles.button.primary.padding,
                    }}
                  >
                    Primary
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
                    Secondary
                  </button>
                </div>
                <div className="bg-[#f5f9f7] rounded-lg p-3 text-xs text-gray-500 text-center">
                  This is a live preview of your theme settings.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
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
