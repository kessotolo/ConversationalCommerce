'use client'

import React from 'react'
import { useAuth } from '@clerk/nextjs'
import { SignIn } from '@clerk/nextjs'
import { UnifiedDashboard } from '@/modules/dashboard/components/UnifiedDashboard'

export default function AdminDashboard() {
    const { isSignedIn, isLoaded } = useAuth()

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                        <p className="text-gray-600">Sign in to access the ConversationalCommerce admin panel</p>
                    </div>
                    <SignIn
                        appearance={{
                            elements: {
                                rootBox: "mx-auto",
                                card: "shadow-xl border-0",
                                headerTitle: "text-2xl font-bold text-gray-900",
                                headerSubtitle: "text-gray-600",
                                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                                footerActionLink: "text-blue-600 hover:text-blue-700"
                            }
                        }}
                    />
                </div>
            </div>
        )
    }

    return <UnifiedDashboard />
}