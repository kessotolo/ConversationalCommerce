'use client'

import React from 'react'
import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
    User,
    LogOut,
    Shield,
    Settings,
    Activity,
    Building2,
    Users,
    AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

export function Navigation() {
    const { isSignedIn, isLoaded } = useAuth()
    const { user } = useUser()

    if (!isLoaded) {
        return (
            <div className="animate-pulse">
                <div className="h-10 w-32 bg-gray-200 rounded"></div>
            </div>
        )
    }

    if (!isSignedIn) {
        return (
            <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                    <Button variant="outline">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                    {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </span>
            </div>

            <div className="flex items-center space-x-2">
                <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                        <Activity className="h-4 w-4 mr-2" />
                        Dashboard
                    </Button>
                </Link>

                <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                        <Building2 className="h-4 w-4 mr-2" />
                        Tenants
                    </Button>
                </Link>

                <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Users
                    </Button>
                </Link>

                <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Security
                    </Button>
                </Link>

                <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                </Link>
            </div>

            <SignOutButton>
                <Button variant="outline" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </SignOutButton>
        </div>
    )
}