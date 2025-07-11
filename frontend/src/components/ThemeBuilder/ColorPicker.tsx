'use client';

import React from 'react';
import type { ColorPalette } from '@/modules/theme/models/theme-builder';

interface ColorPickerProps {
    colors: ColorPalette;
    onChange: (colors: ColorPalette) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ colors, onChange }) => {
    const colorFields = [
        { key: 'primary', label: 'Primary', description: 'Main brand color' },
        { key: 'secondary', label: 'Secondary', description: 'Secondary brand color' },
        { key: 'accent', label: 'Accent', description: 'Highlight color' },
        { key: 'background', label: 'Background', description: 'Main background' },
        { key: 'surface', label: 'Surface', description: 'Card backgrounds' },
        { key: 'text_primary', label: 'Text Primary', description: 'Main text color' },
        { key: 'text_secondary', label: 'Text Secondary', description: 'Secondary text' },
        { key: 'border', label: 'Border', description: 'Border color' },
        { key: 'success', label: 'Success', description: 'Success states' },
        { key: 'warning', label: 'Warning', description: 'Warning states' },
        { key: 'error', label: 'Error', description: 'Error states' },
    ];

    const handleColorChange = (key: keyof ColorPalette, value: string) => {
        onChange({
            ...colors,
            [key]: value,
        });
    };

    return (
        <div className="space-y-4">
            {colorFields.map((field) => (
                <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium">{field.label}</label>
                            <p className="text-xs text-gray-500">{field.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={colors[field.key as keyof ColorPalette]}
                                onChange={(e) => handleColorChange(field.key as keyof ColorPalette, e.target.value)}
                                className="w-8 h-8 rounded border cursor-pointer"
                            />
                            <input
                                type="text"
                                value={colors[field.key as keyof ColorPalette]}
                                onChange={(e) => handleColorChange(field.key as keyof ColorPalette, e.target.value)}
                                className="w-20 px-2 py-1 text-xs border rounded"
                                placeholder="#000000"
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};