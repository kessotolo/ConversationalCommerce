'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
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
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {subValue}
                    </p>
                )}
                {trendValue && (
                    <div className="flex items-center space-x-1 mt-1">
                        {getTrendIcon()}
                        <span className={`text-xs font-medium ${getTrendColor()}`}>
                            {trendValue}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}