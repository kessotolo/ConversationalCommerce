import React from 'react';
import { Bell, User } from 'lucide-react';
import { Button } from '../ui/Button';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-6 border-b">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="User account"
        >
          <User className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
