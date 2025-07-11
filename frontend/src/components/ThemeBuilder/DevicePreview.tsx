'use client';

import React from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import type { PreviewDevice } from '@/modules/theme/models/theme-builder';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DevicePreviewProps {
    currentDevice: PreviewDevice;
    onDeviceChange: (device: PreviewDevice) => void;
}

export const DevicePreview: React.FC<DevicePreviewProps> = ({
    currentDevice,
    onDeviceChange,
}) => {
    const devices = [
        {
            id: 'mobile' as const,
            label: 'Mobile',
            icon: Smartphone,
            description: '375px',
        },
        {
            id: 'tablet' as const,
            label: 'Tablet',
            icon: Tablet,
            description: '768px',
        },
        {
            id: 'desktop' as const,
            label: 'Desktop',
            icon: Monitor,
            description: '1200px',
        },
    ];

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Preview Device</span>
                    <div className="flex items-center gap-1">
                        {devices.map((device) => {
                            const Icon = device.icon;
                            return (
                                <Button
                                    key={device.id}
                                    variant={currentDevice === device.id ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => onDeviceChange(device.id)}
                                    className="flex flex-col items-center gap-1 px-3 py-2 h-auto"
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-xs">{device.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};