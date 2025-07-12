'use client';

import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import StorefrontEditor from '@/components/StorefrontEditor/StorefrontEditor';

/**
 * Storefront Customize Page
 *
 * This page provides a comprehensive drag-and-drop storefront editor
 * with tabs for different customization areas including:
 * - Drafts: Create and manage draft versions
 * - Versions: Version history and rollback
 * - Permissions: User access control
 * - Assets: Image and media management
 * - Banners & Logos: Visual branding elements
 * - Layout Editor: Drag-and-drop layout customization
 */
export default function StorefrontCustomizePage() {
    const { tenant, isLoading } = useTenant();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading storefront editor...</p>
                </div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                    <p className="text-muted-foreground mb-4">
                        You need to be logged in to access the storefront editor.
                    </p>
                    <Button onClick={() => router.push('/dashboard')}>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Customize Storefront</h1>
                            <p className="text-sm text-muted-foreground">
                                Design and customize your storefront with drag-and-drop tools
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard/storefront')}
                        >
                            View Stats
                        </Button>
                        <Button
                            onClick={() => {
                                const baseDomain = process.env['NEXT_PUBLIC_BASE_DOMAIN'] || 'yourplatform.com';
                                const isDefaultDomain = baseDomain === 'yourplatform.com';
                                const isDefaultSubdomain = tenant.subdomain === 'default';
                                const usingPlaceholders = isDefaultDomain || isDefaultSubdomain;
                                const internalStorefrontUrl = `/store/${tenant.id}`;
                                const storeUrl = usingPlaceholders
                                    ? internalStorefrontUrl
                                    : `https://${tenant.subdomain}.${baseDomain}`;

                                window.open(storeUrl, '_blank');
                            }}
                        >
                            Preview Storefront
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-6 py-6">
                <StorefrontEditor tenantId={tenant.id} />
            </div>
        </div>
    );
}