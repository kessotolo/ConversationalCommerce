import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
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
    <div className={cn("rounded-2xl bg-white shadow p-6 flex flex-col gap-2 border border-[#e6f0eb] min-h-[140px]", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-500 font-sans">{title}</span>
          <span className="text-3xl font-extrabold text-gray-900 font-sans">{value}</span>
          {subtitle && (
            <span className="text-xs text-gray-400 font-sans">{subtitle}</span>
          )}
          {typeof change === 'number' && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold mt-1",
              trend === 'up' ? "text-green-600" : trend === 'down' ? "text-red-500" : "text-gray-400"
            )}>
              {trend === 'up' && <ArrowUp className="h-3 w-3" />}
              {trend === 'down' && <ArrowDown className="h-3 w-3" />}
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
        {icon && (
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#e8f6f1] text-[#6C9A8B]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
