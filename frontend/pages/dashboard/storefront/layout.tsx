
import { ThemeContext } from '@/contexts/ThemeContext';

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { FC, useState, Error } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useTheme } from '@/contexts/ThemeContext';
import StorefrontLinks from '@/components/dashboard/StorefrontLinks';
import Link from 'next/link';
import { ChevronLeft, Save, Layout as LayoutIcon, Eye, ArrowUpDown, Columns, Rows } from 'lucide-react';

// Create a custom DragDropIcon since it's not in lucide-react
interface DragDropIconProps {
  className?: string;
}

const DragDropIcon: React.FC<DragDropIconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M12 12v6" />
    <path d="M9 15h6" />
  </svg>
);

// Layout customization content
function LayoutCustomizationContent() {
  const { theme, isLoading } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState('default');
  const [sections, setSections] = useState([
    { id: 'header', name: 'Header', enabled: true, order: 1 },
    { id: 'hero', name: 'Hero Banner', enabled: true, order: 2 },
    { id: 'featured', name: 'Featured Products', enabled: true, order: 3 },
    { id: 'categories', name: 'Categories', enabled: true, order: 4 },
    { id: 'testimonials', name: 'Testimonials', enabled: false, order: 5 },
    { id: 'newsletter', name: 'Newsletter', enabled: true, order: 6 },
    { id: 'footer', name: 'Footer', enabled: true, order: 7 }
  ]);
  
  if (isLoading) {
    return <div className="p-6">Loading layout information...</div>;
  }

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const index = newSections.findIndex(section => section.id === id);
    
    if (direction === 'up' && index > 0) {
      // Skip header which must always be first
      if (newSections[index - 1].id === 'header') return;
      
      // Skip footer which must always be last
      if (newSections[index].id === 'footer') return;
      
      // Swap positions
      const temp = newSections[index];
      newSections[index] = newSections[index - 1];
      newSections[index - 1] = temp;
      
      // Update order values
      newSections[index].order = index + 1;
      newSections[index - 1].order = index;
    } else if (direction === 'down' && index < newSections.length - 1) {
      // Skip header which must always be first
      if (newSections[index].id === 'header') return;
      
      // Skip footer which must always be last
      if (newSections[index + 1].id === 'footer') return;
      
      // Swap positions
      const temp = newSections[index];
      newSections[index] = newSections[index + 1];
      newSections[index + 1] = temp;
      
      // Update order values
      newSections[index].order = index + 1;
      newSections[index + 1].order = index + 2;
    }
    
    setSections(newSections);
  };

  const toggleSection = (id: string) => {
    // Don't allow disabling header or footer
    if (id === 'header' || id === 'footer') return;
    
    const newSections = sections.map(section => {
      if (section.id === id) {
        return { ...section, enabled: !section.enabled };
      }
      return section;
    });
    
    setSections(newSections);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Here you would call your API to save the layout
      // await layoutService.updateLayout({
      //   layout: selectedLayout,
      //   sections: sections
      // });
      
      // Show success message
      alert('Layout updated successfully!');
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Failed to update layout. Please try again.');
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
          <h1 className="text-2xl font-bold">Layout Settings</h1>
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
          {/* Layout presets section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <LayoutIcon className="mr-2" size={20} />
              Layout Presets
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {[
                { id: 'default', name: 'Default', icon: <Columns size={24} /> },
                { id: 'modern', name: 'Modern', icon: <Rows size={24} /> },
                { id: 'minimal', name: 'Minimal', icon: <LayoutIcon size={24} /> }
              ].map((layoutOption) => (
                <button
                  key={layoutOption.id}
                  onClick={() => setSelectedLayout(layoutOption.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedLayout === layoutOption.id ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-center mb-2">{layoutOption.icon}</div>
                  <div className="text-sm font-medium">{layoutOption.name}</div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Section ordering */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <ArrowUpDown className="mr-2" size={20} />
              Section Order & Visibility
            </h2>
            
            <div className="space-y-3">
              {sections.sort((a, b) => a.order - b.order).map((section) => (
                <div 
                  key={section.id}
                  className={`p-3 rounded-lg border ${section.enabled ? 'border-gray-200' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DragDropIcon className="text-gray-400 mr-3" />
                      <span className={section.enabled ? 'font-medium' : 'font-medium text-gray-500'}>
                        {section.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Toggle visibility (except for header and footer) */}
                      {section.id !== 'header' && section.id !== 'footer' && (
                        <button
                          onClick={() => toggleSection(section.id)}
                          className={`px-3 py-1 text-xs rounded-md ${
                            section.enabled 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {section.enabled ? 'Visible' : 'Hidden'}
                        </button>
                      )}
                      
                      {/* Move up/down buttons */}
                      <div className="flex">
                        <button
                          onClick={() => moveSection(section.id, 'up')}
                          disabled={section.id === 'header' || section.order === 1}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        </button>
                        <button
                          onClick={() => moveSection(section.id, 'down')}
                          disabled={section.id === 'footer' || section.order === sections.length}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              Drag and reorder sections to change their position on your storefront.
              Toggle visibility to show or hide sections.
            </div>
          </div>
        </div>
        
        {/* Right column - Preview and links */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <StorefrontLinks className="mb-4" />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Layout Preview</h3>
            
            <div className="border rounded-lg overflow-hidden">
              {sections
                .filter(section => section.enabled)
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <div 
                    key={section.id}
                    className={`p-3 ${section.id === 'header' ? 'bg-gray-800 text-white' : 
                                       section.id === 'hero' ? 'bg-blue-100' :
                                       section.id === 'featured' ? 'bg-purple-50' :
                                       section.id === 'categories' ? 'bg-green-50' :
                                       section.id === 'testimonials' ? 'bg-yellow-50' :
                                       section.id === 'newsletter' ? 'bg-pink-50' :
                                       section.id === 'footer' ? 'bg-gray-700 text-white' : 'bg-white'}`}
                  >
                    <div className="text-xs font-medium text-center">{section.name}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Page component wrapped with ThemeProvider
export default function LayoutCustomizePage() {
  return (
    <ThemeProvider>
      <LayoutCustomizationContent />
    </ThemeProvider>
  );
}
