import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';

const menuItems = [
    { label: 'Sign In', action: 'signin' },
    { label: 'Sign Up', action: 'signup' },
];

const authItems = [
    { label: 'Dashboard', action: 'dashboard' },
    { label: 'Profile', action: 'profile' },
    { label: 'Logout', action: 'logout' },
];

export default function MobileNav() {
    const [open, setOpen] = useState(false);
    const { user, isSignedIn, isLoaded } = useUser();

    // Placeholder handlers
    const handleAction = (action: string) => {
        setOpen(false);
        switch (action) {
            case 'signin':
                window.location.href = '/sign-in';
                break;
            case 'signup':
                window.location.href = '/sign-up';
                break;
            case 'dashboard':
                window.location.href = '/dashboard';
                break;
            case 'profile':
                window.location.href = '/profile';
                break;
            case 'logout':
                window.location.href = '/sign-out';
                break;
            default:
                break;
        }
    };

    // Loading state
    if (!isLoaded) return null;

    return (
        <nav className="w-full flex items-center justify-between px-4 py-3 bg-white shadow-sm sticky top-0 z-50">
            <span className="text-lg font-bold tracking-tight text-gray-800">Conversational Commerce</span>
            <button
                className="flex flex-col justify-center items-center w-10 h-10 rounded focus:outline-none"
                aria-label={open ? 'Close menu' : 'Open menu'}
                onClick={() => setOpen((v) => !v)}
            >
                <span className="sr-only">Menu</span>
                <div className="space-y-1.5">
                    <span
                        className={`block h-1 w-7 rounded bg-gray-800 transition-transform duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`}
                    ></span>
                    <span
                        className={`block h-1 w-7 rounded bg-gray-800 transition-opacity duration-300 ${open ? 'opacity-0' : 'opacity-100'}`}
                    ></span>
                    <span
                        className={`block h-1 w-7 rounded bg-gray-800 transition-transform duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`}
                    ></span>
                </div>
            </button>
            {/* Slide-out menu */}
            <div
                className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ touchAction: 'manipulation' }}
                role="menu"
                aria-label="Main menu"
            >
                <div className="flex flex-col h-full p-6 gap-6">
                    <div className="flex items-center gap-3 mt-2 mb-6">
                        {isSignedIn && user ? (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                {user.firstName?.[0] || user.primaryEmailAddress?.emailAddress?.[0] || 'U'}
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a7.5 7.5 0 0 1 13 0" /></svg>
                            </div>
                        )}
                        <span className="font-semibold text-gray-800 text-base">
                            {isSignedIn && user
                                ? user.firstName || user.primaryEmailAddress?.emailAddress
                                : 'Welcome!'}
                        </span>
                    </div>
                    <div className="flex flex-col gap-4 mt-2">
                        {(isSignedIn && user ? authItems : menuItems).map((item) => (
                            <button
                                key={item.action}
                                className="w-full text-left px-4 py-3 rounded-lg text-lg font-medium text-gray-800 bg-gray-100 hover:bg-blue-50 active:bg-blue-100 transition"
                                onClick={() => handleAction(item.action)}
                                role="menuitem"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1" />
                    <button
                        className="mt-auto text-gray-400 text-xs underline"
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                    >
                        Close
                    </button>
                </div>
            </div>
            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-20 z-40"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}
        </nav>
    );
}