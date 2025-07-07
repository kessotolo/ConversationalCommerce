'use client';

import React, { useState, useEffect } from 'react';
import { Eye, BarChart3, ShoppingBag, TrendingUp, Loader2, Save } from 'lucide-react';

import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StorefrontLinks from '@/components/dashboard/StorefrontLinks';
import { useTenant } from '@/contexts/TenantContext';
import { useTheme } from '@/contexts/ThemeContext';

interface StorefrontStats {
    visitors: number;
    conversionRate: number;
    productsViewed: number;
    visitorsGrowth: number;
    conversionGrowth: number;
    productsGrowth: number;
}

interface StorefrontSEO {
    title: string;
    description: string;
    keywords: string;
}

export default function StorefrontPage() {
    const { theme, isLoading: themeLoading } = useTheme();
    const { tenant, isLoading: tenantLoading } = useTenant();
    const { toast } = useToast();

    const [stats, setStats] = useState<StorefrontStats | null>(null);
    const [seo, setSeo] = useState<StorefrontSEO>({
        title: '',
        description: '',
        keywords: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchStorefrontData = async () => {
            if (!tenant?.id) return;

            try {
                setLoading(true);

                // Fetch storefront stats
                const statsResponse = await fetch(`/api/v1/storefront/stats?tenant_id=${tenant.id}`);
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setStats(statsData);
                }

                // Fetch storefront SEO settings
                const seoResponse = await fetch(`/api/v1/storefront/seo?tenant_id=${tenant.id}`);
                if (seoResponse.ok) {
                    const seoData = await seoResponse.json();
                    setSeo(seoData);
                } else {
                    // Set default values if no SEO data exists
                    setSeo({
                        title: `${theme?.name || 'My Store'} - Online Store`,
                        description: 'Shop our latest products with secure checkout and fast delivery.',
                        keywords: 'online store, products, shopping',
                    });
                }
            } catch (error) {
                console.error('Error fetching storefront data:', error);
                toast({
                    title: "Error",
                    description: "Failed to load storefront data",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStorefrontData();
    }, [tenant?.id, theme?.name, toast]);

    const handleSeoSave = async () => {
        if (!tenant?.id) return;

        try {
            setSaving(true);

            const response = await fetch(`/api/v1/storefront/seo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tenant_id: tenant.id,
                    ...seo,
                }),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "SEO settings saved successfully",
                });
            } else {
                throw new Error('Failed to save SEO settings');
            }
        } catch (error) {
            console.error('Error saving SEO settings:', error);
            toast({
                title: "Error",
                description: "Failed to save SEO settings",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (themeLoading || tenantLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading storefront...</p>
                </div>
            </div>
        );
    }

    const baseDomain = process.env['NEXT_PUBLIC_BASE_DOMAIN'] || 'yourplatform.com';
    const isDefaultDomain = baseDomain === 'yourplatform.com';
    const isDefaultSubdomain = (tenant?.subdomain || 'default') === 'default';
    const usingPlaceholders = isDefaultDomain || isDefaultSubdomain;
    const internalStorefrontUrl = tenant ? `/store/${tenant.id}` : '#';
    const storeUrl = usingPlaceholders
        ? internalStorefrontUrl
        : `https://${theme?.subdomain || 'default'}.${baseDomain}`;

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row items-center justify-between px-6 py-10 bg-gradient-to-r from-primary/10 to-background rounded-b-3xl shadow-sm mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">
                        Your Storefront
                    </h1>
                    <p className="text-lg text-muted-foreground mb-4">
                        Manage your online presence, preview your theme, and track your store's performance.
                    </p>
                </div>
                <Button asChild>
                    <a
                        href={storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                    >
                        <Eye size={20} /> View Storefront
                    </a>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 px-4">
                {/* Sidebar Navigation */}
                <aside className="md:col-span-1 sticky top-24 self-start">
                    <Card>
                        <CardContent className="p-4">
                            <StorefrontLinks />
                        </CardContent>
                    </Card>
                </aside>

                {/* Main Content */}
                <main className="md:col-span-4 flex flex-col gap-8">
                    {/* Theme Preview */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Theme: {theme?.name || 'Default'}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Preview how your storefront looks to customers.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg p-6 bg-muted/50 flex flex-col gap-4 max-w-md mx-auto">
                                <div className="h-12 rounded-lg flex items-center justify-center mb-2 bg-primary text-primary-foreground font-bold">
                                    Storefront Header
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Button size="sm">Primary</Button>
                                    <Button variant="secondary" size="sm">Secondary</Button>
                                </div>
                                <Card>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold mb-2">Sample Card</h3>
                                        <p className="text-sm text-muted-foreground">
                                            This is how your product cards will appear on your storefront.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button asChild>
                                    <a href="/dashboard/storefront/customize">
                                        Customize Storefront
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storefront Statistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Storefront Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="flex flex-col items-center bg-muted/50 rounded-lg p-6">
                                    <BarChart3 className="w-8 h-8 text-primary mb-2" />
                                    <p className="text-sm text-muted-foreground">Visitors (Last 7 days)</p>
                                    <p className="text-2xl font-bold">{stats?.visitors || 0}</p>
                                    {stats?.visitorsGrowth && (
                                        <p className="text-xs text-muted-foreground">
                                            {stats.visitorsGrowth > 0 ? '+' : ''}{stats.visitorsGrowth.toFixed(1)}% from last week
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center bg-muted/50 rounded-lg p-6">
                                    <TrendingUp className="w-8 h-8 text-primary mb-2" />
                                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                    <p className="text-2xl font-bold">{stats?.conversionRate || 0}%</p>
                                    {stats?.conversionGrowth && (
                                        <p className="text-xs text-muted-foreground">
                                            {stats.conversionGrowth > 0 ? '+' : ''}{stats.conversionGrowth.toFixed(1)}% from last week
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center bg-muted/50 rounded-lg p-6">
                                    <ShoppingBag className="w-8 h-8 text-primary mb-2" />
                                    <p className="text-sm text-muted-foreground">Products Viewed</p>
                                    <p className="text-2xl font-bold">{stats?.productsViewed || 0}</p>
                                    {stats?.productsGrowth && (
                                        <p className="text-xs text-muted-foreground">
                                            {stats.productsGrowth > 0 ? '+' : ''}{stats.productsGrowth.toFixed(1)}% from last week
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storefront SEO */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Storefront SEO</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="seo-title">Title</Label>
                                    <Input
                                        id="seo-title"
                                        value={seo.title}
                                        onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                                        placeholder="Enter storefront title"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="seo-description">Description</Label>
                                    <Textarea
                                        id="seo-description"
                                        value={seo.description}
                                        onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                                        placeholder="Enter storefront description"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="seo-keywords">Keywords</Label>
                                    <Input
                                        id="seo-keywords"
                                        value={seo.keywords}
                                        onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                                        placeholder="Enter keywords separated by commas"
                                    />
                                </div>
                                <Button onClick={handleSeoSave} disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save SEO Settings
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}