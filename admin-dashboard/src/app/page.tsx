'use client'

import React from 'react'
import { useAuth } from '@clerk/nextjs'
import { SignIn } from '@clerk/nextjs'
import { UnifiedDashboard } from '@/modules/dashboard/components/UnifiedDashboard'

export default function AdminDashboard() {
    const { isSignedIn, isLoaded } = useAuth()

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading SuperAdmin Dashboard...</p>
                </div>
            </div>
        )
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">SuperAdmin Access</h1>
                        <p className="text-gray-600">Sign in to access the ConversationalCommerce admin panel</p>
                    </div>
                    <div className="admin-card p-6">
                        <SignIn
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    card: "shadow-none border-0 p-0",
                                    headerTitle: "text-xl font-semibold text-gray-900",
                                    headerSubtitle: "text-gray-600",
                                    formButtonPrimary: "admin-button-primary w-full",
                                    footerActionLink: "text-blue-600 hover:text-blue-700",
                                    formFieldInput: "admin-input",
                                    formFieldLabel: "text-sm font-medium text-gray-700"
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        )
    }

    return <UnifiedDashboard />
}