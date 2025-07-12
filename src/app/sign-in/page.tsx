import React from 'react';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
                <SignIn routing="hash" path="/sign-in" fallbackRedirectUrl="/dashboard" />
            </div>
        </div>
    );
}