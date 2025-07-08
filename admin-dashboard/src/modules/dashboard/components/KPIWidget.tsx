'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KPIWidgetProps {
    title: string;
    value: string;
    subValue?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
    className?: string;
}

export function KPIWidget({
    title,
    value,
    subValue,
    icon: Icon,
    trend = 'stable',
    trendValue,
    className
}: KPIWidgetProps) {
    const getTrendIcon = () => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="h-3 w-3 text-green-600" />;
            case 'down':
                return <TrendingDown className="h-3 w-3 text-red-600" />;
            default:
                return <Minus className="h-3 w-3 text-gray-600" />;
        }
    };

    const getTrendColor = () => {
        switch (trend) {
            case 'up':
                return 'text-green-600';
            case 'down':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div className={`admin-metric-card ${className || ''}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="admin-metric-label">{title}</p>
                    <p className="admin-metric-value">{value}</p>
                    {subValue && (
                        <p className="text-sm text-gray-600 mt-1">
                            {subValue}
                        </p>
                    )}
                    {trendValue && (
                        <div className="flex items-center space-x-1 mt-2">
                            {getTrendIcon()}
                            <span className={`text-xs font-medium ${getTrendColor()}`}>
                                {trendValue}
                            </span>
                        </div>
                    )}
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-gray-600" />
                </div>
            </div>
        </div>
    );
}