'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';

interface UserButtonProps {
  afterSignOutUrl?: string;
}

/**
 * A simple user button component that handles sign out functionality
 */
export function UserButton({ afterSignOutUrl = '/' }: UserButtonProps) {
  const router = useRouter();

  const handleSignOut = () => {
    // In a real implementation, this would call an auth service
    // For now, just redirect to the afterSignOutUrl
    console.log('User signed out');
    router.push(afterSignOutUrl as Route);
  };

  return (
    <button
      onClick={handleSignOut}
      className="rounded-full bg-gray-100 p-1 hover:bg-gray-200 transition-colors"
      aria-label="User menu"
    >
      <span className="sr-only">User menu</span>
      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
        U
      </div>
    </button>
  );
}

export default UserButton;
