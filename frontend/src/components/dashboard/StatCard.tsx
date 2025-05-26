import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../ui/Card';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: number;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  change, 
  className,
  trend = 'neutral',
  subtitle 
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {typeof change === 'number' && (
              <div className="flex items-center mt-2">
                {trend === 'up' && (
                  <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                )}
                {trend === 'down' && (
                  <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  trend === 'up' ? "text-green-500" : 
                  trend === 'down' ? "text-red-500" : 
                  "text-muted-foreground"
                )}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2 bg-primary/10 rounded-md">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
