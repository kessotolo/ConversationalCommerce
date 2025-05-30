import React, { useState } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useTheme } from '@/contexts/ThemeContext';
import StorefrontLinks from '@/components/dashboard/StorefrontLinks';
import Link from 'next/link';
import { ChevronLeft, Save, Palette, Eye } from 'lucide-react';

// Theme customization content
function ThemeCustomizationContent() {
  const { theme, setTheme, isLoading, availableThemes } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(theme?.colors?.primary || '#6366F1');
  const [secondaryColor, setSecondaryColor] = useState(theme?.colors?.secondary || '#8B5CF6');
  const [accentColor, setAccentColor] = useState(theme?.colors?.accent || '#EC4899');
  const [backgroundColor, setBackgroundColor] = useState(theme?.colors?.background || '#F9FAFB');
  const [textColor, setTextColor] = useState(theme?.colors?.text || '#111827');
  const [errorColor, setErrorColor] = useState(theme?.colors?.error || '#ef4444');
  const [successColor, setSuccessColor] = useState(theme?.colors?.success || '#22c55e');
  const [warningColor, setWarningColor] = useState(theme?.colors?.warning || '#f59e0b');

  if (isLoading) {
    return <div className="p-6">Loading theme information...</div>;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Prepare updated theme data
      const updatedTheme = {
        ...theme,
        colors: {
          ...(theme?.colors || {}), // Preserve any other color properties
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          background: backgroundColor,
          text: textColor,
          error: errorColor,
          success: successColor,
          warning: warningColor,
        }
      };

      // Here you would call your API to save the theme
      // await themeService.updateTheme(updatedTheme);

      // Update local theme state
      setTheme(updatedTheme);

      // Show success message
      alert('Theme updated successfully!');
    } catch (error) {
      console.error('Error saving theme:', error);
      alert('Failed to update theme. Please try again.');
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
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
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
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
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
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
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
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
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
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
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
                    value={errorColor}
                    onChange={(e) => setErrorColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={errorColor}
                    onChange={(e) => setErrorColor(e.target.value)}
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
                    value={successColor}
                    onChange={(e) => setSuccessColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={successColor}
                    onChange={(e) => setSuccessColor(e.target.value)}
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
                    value={warningColor}
                    onChange={(e) => setWarningColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <input
                    type="text"
                    value={warningColor}
                    onChange={(e) => setWarningColor(e.target.value)}
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
                    setPrimaryColor(presetTheme.primary);
                    setSecondaryColor(presetTheme.secondary);
                    setAccentColor(presetTheme.accent);
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
              <div style={{ backgroundColor }} className="p-4 rounded-lg mb-4">
                <div style={{ color: textColor }} className="mb-4">
                  <h4 className="font-bold text-lg mb-1">Sample Heading</h4>
                  <p className="text-sm">This is how your text will appear</p>
                </div>

                <div className="flex space-x-2 mb-4">
                  <button
                    style={{ backgroundColor: primaryColor, color: 'white' }}
                    className="px-3 py-1 rounded-md text-sm"
                  >
                    Primary Button
                  </button>
                  <button
                    style={{ backgroundColor: secondaryColor, color: 'white' }}
                    className="px-3 py-1 rounded-md text-sm"
                  >
                    Secondary
                  </button>
                </div>

                <div
                  style={{ backgroundColor: accentColor, color: 'white' }}
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

// Page component wrapped with ThemeProvider
export default function ThemeCustomizePage() {
  return (
    <ThemeProvider>
      <ThemeCustomizationContent />
    </ThemeProvider>
  );
}
