'use client';
import { UserButton, useClerk } from '@clerk/nextjs';
import { useState } from 'react';

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
    const { signOut } = useClerk();
    const [settingsOpen, setSettingsOpen] = useState(false);
    return (
        <>
            {children}
        </>
    );
}