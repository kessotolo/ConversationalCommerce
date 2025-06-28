import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-6 border-b bg-white/80 backdrop-blur rounded-t-xl px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 font-sans">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4 mt-4 sm:mt-0">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] font-sans"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        {/* Notification Bell */}
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition-all">
          <Bell className="h-5 w-5 text-gray-500" />
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
        </button>
        {/* User Avatar */}
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
