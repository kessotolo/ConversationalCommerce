'use client';

import React from 'react';
import type { TypographySettings } from '@/modules/theme/models/theme-builder';

interface TypographySelectorProps {
    typography: TypographySettings;
    onChange: (typography: TypographySettings) => void;
}

export const TypographySelector: React.FC<TypographySelectorProps> = ({ typography, onChange }) => {
    const fontFamilies = [
        { value: 'Inter', label: 'Inter' },
        { value: 'Roboto', label: 'Roboto' },
        { value: 'Open Sans', label: 'Open Sans' },
        { value: 'Lato', label: 'Lato' },
        { value: 'Poppins', label: 'Poppins' },
        { value: 'Montserrat', label: 'Montserrat' },
        { value: 'Source Sans Pro', label: 'Source Sans Pro' },
        { value: 'Nunito', label: 'Nunito' },
    ];

    const fontSizes = [
        { value: '12px', label: '12px' },
        { value: '14px', label: '14px' },
        { value: '16px', label: '16px' },
        { value: '18px', label: '18px' },
        { value: '20px', label: '20px' },
        { value: '24px', label: '24px' },
        { value: '28px', label: '28px' },
        { value: '32px', label: '32px' },
        { value: '36px', label: '36px' },
    ];

    const fontWeights = [
        { value: 300, label: 'Light (300)' },
        { value: 400, label: 'Normal (400)' },
        { value: 500, label: 'Medium (500)' },
        { value: 600, label: 'Semi Bold (600)' },
        { value: 700, label: 'Bold (700)' },
        { value: 800, label: 'Extra Bold (800)' },
    ];

    const handleChange = (key: keyof TypographySettings, value: string | number) => {
        onChange({
            ...typography,
            [key]: value,
        });
    };

    return (
        <div className="space-y-4">
            {/* Font Families */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Primary Font</label>
                <select
                    value={typography.font_family_primary}
                    onChange={(e) => handleChange('font_family_primary', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                >
                    {fontFamilies.map((font) => (
                        <option key={font.value} value={font.value}>
                            {font.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Secondary Font</label>
                <select
                    value={typography.font_family_secondary}
                    onChange={(e) => handleChange('font_family_secondary', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                >
                    {fontFamilies.map((font) => (
                        <option key={font.value} value={font.value}>
                            {font.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Font Sizes */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Base Font Size</label>
                    <select
                        value={typography.font_size_base}
                        onChange={(e) => handleChange('font_size_base', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                    >
                        {fontSizes.map((size) => (
                            <option key={size.value} value={size.value}>
                                {size.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">H1 Font Size</label>
                    <select
                        value={typography.font_size_h1}
                        onChange={(e) => handleChange('font_size_h1', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                    >
                        {fontSizes.map((size) => (
                            <option key={size.value} value={size.value}>
                                {size.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Font Weights */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Normal Weight</label>
                    <select
                        value={typography.font_weight_normal}
                        onChange={(e) => handleChange('font_weight_normal', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md"
                    >
                        {fontWeights.map((weight) => (
                            <option key={weight.value} value={weight.value}>
                                {weight.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Bold Weight</label>
                    <select
                        value={typography.font_weight_bold}
                        onChange={(e) => handleChange('font_weight_bold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md"
                    >
                        {fontWeights.map((weight) => (
                            <option key={weight.value} value={weight.value}>
                                {weight.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Line Height */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Line Height</label>
                <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="3"
                    value={typography.line_height_base}
                    onChange={(e) => handleChange('line_height_base', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                />
            </div>

            {/* Letter Spacing */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Letter Spacing</label>
                <input
                    type="text"
                    value={typography.letter_spacing_base}
                    onChange={(e) => handleChange('letter_spacing_base', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="0px"
                />
            </div>
        </div>
    );
};