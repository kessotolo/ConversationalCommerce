'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Settings, Eye, EyeOff, Trash2, Save, Undo, ChevronUp, ChevronDown } from 'lucide-react';

import type { ThemeLayoutSchema, ThemeSection, PreviewDevice } from '@/modules/theme/models/theme-builder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ThemePreview } from './ThemePreview';
import { ColorPicker } from './ColorPicker';
import { TypographySelector } from './TypographySelector';
import { DevicePreview } from './DevicePreview';

interface ThemeBuilderProps {
    initialLayout?: ThemeLayoutSchema;
    onSave?: (layout: ThemeLayoutSchema) => void;
    onPreview?: (layout: ThemeLayoutSchema) => void;
    className?: string;
}

export const ThemeBuilder: React.FC<ThemeBuilderProps> = ({
    initialLayout,
    onSave,
    onPreview,
    className = '',
}) => {
    const { toast } = useToast();
    const [layout, setLayout] = useState<ThemeLayoutSchema>(
        initialLayout || getDefaultLayout()
    );
    const [selectedSection, setSelectedSection] = useState<string | undefined>();
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('mobile');
    const [isDirty, setIsDirty] = useState(false);

    // Update layout and mark as dirty
    const updateLayout = useCallback((newLayout: ThemeLayoutSchema) => {
        setLayout(newLayout);
        setIsDirty(true);
    }, []);

    // Handle section reordering
    const moveSection = useCallback((fromIndex: number, toIndex: number) => {
        const sections = Array.from(layout.sections);
        const [movedSection] = sections.splice(fromIndex, 1);
        if (movedSection) {
            sections.splice(toIndex, 0, movedSection);

            // Update order numbers
            const updatedSections = sections.map((section, index) => ({
                ...section,
                order: index + 1,
            }));

            updateLayout({
                ...layout,
                sections: updatedSections,
            });
        }
    }, [layout, updateLayout]);

    // Add new section
    const addSection = useCallback((sectionType: string) => {
        const newSection: ThemeSection = {
            id: `section-${Date.now()}`,
            type: sectionType,
            title: `New ${sectionType}`,
            visible: true,
            order: layout.sections.length + 1,
            config: {},
        };

        updateLayout({
            ...layout,
            sections: [...layout.sections, newSection],
        });

        setSelectedSection(newSection.id);
    }, [layout, updateLayout]);

    // Remove section
    const removeSection = useCallback((sectionId: string) => {
        const updatedSections = layout.sections
            .filter(section => section.id !== sectionId)
            .map((section, index) => ({
                ...section,
                order: index + 1,
            }));

        updateLayout({
            ...layout,
            sections: updatedSections,
        });

        if (selectedSection === sectionId) {
            setSelectedSection(undefined);
        }
    }, [layout, updateLayout, selectedSection, updateLayout]);

    // Toggle section visibility
    const toggleSectionVisibility = useCallback((sectionId: string) => {
        const updatedSections = layout.sections.map(section =>
            section.id === sectionId
                ? { ...section, visible: !section.visible }
                : section
        );

        updateLayout({
            ...layout,
            sections: updatedSections,
        });
    }, [layout, updateLayout]);

    // Update section config
    const updateSectionConfig = useCallback((sectionId: string, config: Record<string, any>) => {
        const updatedSections = layout.sections.map(section =>
            section.id === sectionId
                ? { ...section, config: { ...section.config, ...config } }
                : section
        );

        updateLayout({
            ...layout,
            sections: updatedSections,
        });
    }, [layout, updateLayout]);

    // Update colors
    const updateColors = useCallback((colors: any) => {
        updateLayout({
            ...layout,
            colors,
        });
    }, [layout, updateLayout]);

    // Update typography
    const updateTypography = useCallback((typography: any) => {
        updateLayout({
            ...layout,
            typography,
        });
    }, [layout, updateLayout]);

    // Save theme
    const handleSave = useCallback(() => {
        try {
            onSave?.(layout);
            setIsDirty(false);
            toast({
                title: 'Theme saved',
                description: 'Your theme has been saved successfully.',
            });
        } catch (error) {
            toast({
                title: 'Error saving theme',
                description: 'Failed to save theme. Please try again.',
                variant: 'destructive',
            });
        }
    }, [layout, onSave, toast]);

    // Reset to default
    const handleReset = useCallback(() => {
        setLayout(getDefaultLayout());
        setSelectedSection(undefined);
        setIsDirty(false);
        toast({
            title: 'Theme reset',
            description: 'Theme has been reset to default settings.',
        });
    }, [toast]);

    // Section types available
    const sectionTypes = useMemo(() => [
        { id: 'header', name: 'Header', icon: '🏠' },
        { id: 'hero', name: 'Hero Section', icon: '⭐' },
        { id: 'products', name: 'Products Grid', icon: '📦' },
        { id: 'testimonials', name: 'Testimonials', icon: '💬' },
        { id: 'newsletter', name: 'Newsletter', icon: '📧' },
        { id: 'footer', name: 'Footer', icon: '🔗' },
    ], []);

    const selectedSectionData = useMemo(() =>
        layout.sections.find(section => section.id === selectedSection),
        [layout.sections, selectedSection]
    );

    return (
        <div className={`flex flex-col lg:flex-row h-full gap-4 ${className}`}>
            {/* Left Panel - Builder */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Header */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Theme Builder</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    disabled={!isDirty}
                                >
                                    <Undo className="w-4 h-4 mr-2" />
                                    Reset
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={!isDirty}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Sections */}
                <Card className="flex-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Sections</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSection(undefined)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Section
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="space-y-2">
                            {layout.sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className={`
                    p-3 border rounded-lg transition-all
                    ${selectedSection === section.id ? 'ring-2 ring-primary' : 'bg-background'}
                  `}
                                    onClick={() => setSelectedSection(section.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{sectionTypes.find(t => t.id === section.type)?.icon || '📄'}</span>
                                            <span className="font-medium">{section.title || section.type}</span>
                                            <Badge variant={section.visible ? 'default' : 'secondary'}>
                                                {section.visible ? 'Visible' : 'Hidden'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {index > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveSection(index, index - 1);
                                                    }}
                                                >
                                                    <ChevronUp className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {index < layout.sections.length - 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveSection(index, index + 1);
                                                    }}
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSectionVisibility(section.id);
                                                }}
                                            >
                                                {section.visible ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeSection(section.id);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Section Configuration */}
                {selectedSectionData && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Section Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Title</label>
                                    <input
                                        type="text"
                                        value={selectedSectionData.title || ''}
                                        onChange={(e) => updateSectionConfig(selectedSectionData.id, { title: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                        placeholder="Section title"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Type</label>
                                    <select
                                        value={selectedSectionData.type}
                                        onChange={(e) => updateSectionConfig(selectedSectionData.id, { type: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                    >
                                        {sectionTypes.map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Right Panel - Preview & Settings */}
            <div className="w-full lg:w-96 flex flex-col gap-4">
                {/* Device Preview Toggle */}
                <DevicePreview
                    currentDevice={previewDevice}
                    onDeviceChange={setPreviewDevice}
                />

                {/* Live Preview */}
                <Card className="flex-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ThemePreview
                            layout={layout}
                            device={previewDevice}
                            className="w-full h-64"
                        />
                    </CardContent>
                </Card>

                {/* Color Settings */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Colors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ColorPicker
                            colors={layout.colors}
                            onChange={updateColors}
                        />
                    </CardContent>
                </Card>

                {/* Typography Settings */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Typography</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TypographySelector
                            typography={layout.typography}
                            onChange={updateTypography}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// Default layout function
function getDefaultLayout(): ThemeLayoutSchema {
    return {
        sections: [
            {
                id: 'header',
                type: 'header',
                title: 'Header',
                visible: true,
                order: 1,
                config: {},
            },
            {
                id: 'hero',
                type: 'hero',
                title: 'Hero Section',
                visible: true,
                order: 2,
                config: {},
            },
            {
                id: 'products',
                type: 'products',
                title: 'Products',
                visible: true,
                order: 3,
                config: {},
            },
            {
                id: 'footer',
                type: 'footer',
                title: 'Footer',
                visible: true,
                order: 4,
                config: {},
            },
        ],
        colors: {
            primary: '#3B82F6',
            secondary: '#64748B',
            accent: '#F59E0B',
            background: '#FFFFFF',
            surface: '#F8FAFC',
            text_primary: '#1E293B',
            text_secondary: '#64748B',
            border: '#E2E8F0',
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
        },
        typography: {
            font_family_primary: 'Inter',
            font_family_secondary: 'Inter',
            font_size_base: '16px',
            font_size_h1: '32px',
            font_size_h2: '24px',
            font_size_h3: '20px',
            font_size_h4: '18px',
            font_size_h5: '16px',
            font_size_h6: '14px',
            font_weight_normal: 400,
            font_weight_medium: 500,
            font_weight_bold: 700,
            line_height_base: 1.5,
            letter_spacing_base: '0px',
        },
        spacing: {
            spacing_xs: '4px',
            spacing_sm: '8px',
            spacing_md: '16px',
            spacing_lg: '24px',
            spacing_xl: '32px',
            spacing_2xl: '48px',
            spacing_3xl: '64px',
        },
        breakpoints: {
            mobile: '768px',
            tablet: '1024px',
            desktop: '1280px',
            wide: '1536px',
        },
    };
}