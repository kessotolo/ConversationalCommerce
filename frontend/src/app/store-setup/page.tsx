"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { Route } from 'next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ArrowRight, Store, Phone, User, Mail, Globe, MessageCircle, Sparkles, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import StoreSetupSuccess from '@/components/onboarding/StoreSetupSuccess';

interface StoreSetupForm {
    storeName: string;
    businessName: string;
    phoneNumber: string;
    whatsappNumber: string;
    email: string;
    category: string;
    description: string;
    storeUrl: string;
}

export default function StoreSetupPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [formData, setFormData] = useState<StoreSetupForm>({
        storeName: '',
        businessName: '',
        phoneNumber: '',
        whatsappNumber: '',
        email: user?.primaryEmailAddress?.emailAddress || '',
        category: '',
        description: '',
        storeUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedSubdomain, setGeneratedSubdomain] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdStore, setCreatedStore] = useState<{ name: string; subdomain: string } | null>(null);

    // Generate subdomain from store name
    const generateSubdomain = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'my-store';
    };

    // Handle form data changes
    const handleInputChange = (field: keyof StoreSetupForm, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Generate subdomain preview when store name changes
        if (field === 'storeName') {
            const subdomain = generateSubdomain(value);
            setGeneratedSubdomain(subdomain);
            setFormData(prev => ({ ...prev, storeUrl: `${subdomain}.enwhe.io` }));
        }

        // Auto-fill WhatsApp number if same as phone number
        if (field === 'phoneNumber' && !formData.whatsappNumber) {
            setFormData(prev => ({ ...prev, whatsappNumber: value }));
        }
    };

    // Validate current step
    const validateStep = (currentStep: number): boolean => {
        switch (currentStep) {
            case 1: // Store Basics
                return !!(formData.storeName && formData.businessName);
            case 2: // Contact Info
                return !!(formData.phoneNumber && formData.email);
            case 3: // Business Details
                return !!(formData.category && formData.description);
            default:
                return false;
        }
    };

    // Handle step completion
    const handleStepComplete = () => {
        if (validateStep(step)) {
            setCompletedSteps(prev => [...prev, step]);
            if (step < 3) {
                setStep(step + 1);
            } else {
                handleSubmit();
            }
        }
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!isLoaded || !user) {
            setError('User authentication required');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const subdomain = generatedSubdomain || generateSubdomain(formData.storeName);
            const whatsappNumber = formData.whatsappNumber || formData.phoneNumber;

            // Create tenant/store using the correct API endpoint and schema
            const response = await fetch('/api/v1/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessName: formData.businessName,
                    subdomain: subdomain,
                    phoneNumber: formData.phoneNumber,
                    whatsappNumber: whatsappNumber,
                    storeEmail: formData.email,
                }),
            });

            if (!response.ok) {
                let message = 'Failed to create store';
                try {
                    const data = await response.json();
                    message = data.detail || data.message || message;
                } catch {
                    // fallback to status text if not JSON
                    message = response.statusText || message;
                }
                throw new Error(message);
            }

            const result = await response.json();

            // Set success state with store details
            setCreatedStore({
                name: formData.storeName,
                subdomain: generatedSubdomain || generateSubdomain(formData.storeName)
            });
            setShowSuccess(true);
        } catch (err) {
            console.error('Store creation error:', err);
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // Business categories
    const categories = [
        { value: 'retail', label: 'Retail & Consumer Goods' },
        { value: 'food', label: 'Food & Beverages' },
        { value: 'fashion', label: 'Fashion & Apparel' },
        { value: 'electronics', label: 'Electronics & Technology' },
        { value: 'health', label: 'Health & Beauty' },
        { value: 'home', label: 'Home & Furniture' },
        { value: 'art', label: 'Art & Crafts' },
        { value: 'services', label: 'Services' },
        { value: 'other', label: 'Other' },
    ];

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7faf9] to-[#e6f0eb]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C9A8B] mx-auto mb-4" />
                    <p className="text-gray-600">Loading your account...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        router.push('/auth/sign-in' as Route);
        return null;
    }

    if (showSuccess && createdStore) {
        return (
            <StoreSetupSuccess
                storeName={createdStore.name}
                subdomain={createdStore.subdomain}
                onContinue={() => router.push('/dashboard' as Route)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f7faf9] to-[#e6f0eb]">
            {/* Top Navigation Header */}
            <header className="bg-white shadow-sm" role="banner">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <Link
                                href={'/' as Route}
                                className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded-md"
                                aria-label="enwhe.io home page"
                            >
                                <MessageCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
                                <span className="text-xl font-bold text-gray-900">enwhe.io</span>
                            </Link>
                        </div>
                        <nav>
                            <Link
                                href={'/' as Route}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded-md px-3 py-2"
                                aria-label="Back to landing page"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="text-sm font-medium">Back to Home</span>
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="p-3 bg-gradient-to-r from-[#6C9A8B] to-[#5d8a7b] rounded-full">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">Welcome to Conversational Commerce</h1>
                        </div>
                        <p className="text-gray-600 text-lg">Let's set up your store in just a few steps</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center space-x-4">
                            {[1, 2, 3].map((stepNumber) => (
                                <div key={stepNumber} className="flex items-center">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${completedSteps.includes(stepNumber)
                                        ? 'bg-[#6C9A8B] border-[#6C9A8B] text-white scale-110'
                                        : step === stepNumber
                                            ? 'border-[#6C9A8B] text-[#6C9A8B] scale-105'
                                            : 'border-gray-300 text-gray-400'
                                        }`}>
                                        {completedSteps.includes(stepNumber) ? (
                                            <CheckCircle className="w-6 h-6" />
                                        ) : (
                                            <span className="text-sm font-medium">{stepNumber}</span>
                                        )}
                                    </div>
                                    {stepNumber < 3 && (
                                        <div className={`w-16 h-1 mx-3 transition-all duration-300 ${completedSteps.includes(stepNumber + 1)
                                            ? 'bg-[#6C9A8B]'
                                            : 'bg-gray-300'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form Card */}
                    <Card className="w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                {step === 1 && <Store className="w-6 h-6 text-[#6C9A8B]" />}
                                {step === 2 && <Phone className="w-6 h-6 text-[#6C9A8B]" />}
                                {step === 3 && <User className="w-6 h-6 text-[#6C9A8B]" />}
                                {step === 1 && 'Store Basics'}
                                {step === 2 && 'Contact Information'}
                                {step === 3 && 'Business Details'}
                            </CardTitle>
                            <CardDescription className="text-base">
                                {step === 1 && 'Tell us about your store and business'}
                                {step === 2 && 'How can customers reach you?'}
                                {step === 3 && 'Help us understand your business better'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Step 1: Store Basics */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <Label htmlFor="storeName" className="text-base font-medium">Store Name *</Label>
                                        <Input
                                            id="storeName"
                                            value={formData.storeName}
                                            onChange={(e) => handleInputChange('storeName', e.target.value)}
                                            placeholder="Joe's Coffee"
                                            className="mt-2 h-12 text-base"
                                        />
                                        {generatedSubdomain && (
                                            <div className="mt-2 p-3 bg-[#f7faf9] rounded-lg border border-[#e6f0eb]">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-[#6C9A8B]" />
                                                    <span className="text-sm text-gray-600">Your store URL:</span>
                                                    <span className="font-mono text-sm font-medium text-[#6C9A8B]">
                                                        {generatedSubdomain}.enwhe.io
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="businessName" className="text-base font-medium">Business/Legal Name *</Label>
                                        <Input
                                            id="businessName"
                                            value={formData.businessName}
                                            onChange={(e) => handleInputChange('businessName', e.target.value)}
                                            placeholder="Joe's Coffee LLC"
                                            className="mt-2 h-12 text-base"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Contact Information */}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <div>
                                        <Label htmlFor="phoneNumber" className="text-base font-medium">Phone Number *</Label>
                                        <Input
                                            id="phoneNumber"
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                            placeholder="+2348012345678"
                                            className="mt-2 h-12 text-base"
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            This will be your primary contact number
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="whatsappNumber" className="text-base font-medium flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4" />
                                            WhatsApp Number
                                        </Label>
                                        <Input
                                            id="whatsappNumber"
                                            type="tel"
                                            value={formData.whatsappNumber}
                                            onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                                            placeholder="+2348012345678"
                                            className="mt-2 h-12 text-base"
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            {formData.whatsappNumber === formData.phoneNumber
                                                ? "Same as phone number (recommended)"
                                                : "Leave empty to use phone number"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="email" className="text-base font-medium">Email Address *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            placeholder="hello@joescoffee.com"
                                            className="mt-2 h-12 text-base"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Business Details */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <div>
                                        <Label htmlFor="category" className="text-base font-medium">Business Category *</Label>
                                        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                                            <SelectTrigger className="mt-2 h-12 text-base">
                                                <SelectValue placeholder="Select your business category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.value} value={category.value}>
                                                        {category.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="description" className="text-base font-medium">Business Description</Label>
                                        <textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="Tell us about your business, what you sell, and your unique value proposition..."
                                            className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg resize-none text-base"
                                            rows={4}
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            This helps us customize your store experience
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex justify-between pt-6">
                                {step > 1 ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep(step - 1)}
                                        disabled={loading}
                                        className="h-12 px-6"
                                    >
                                        Back
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push('/' as Route)}
                                        disabled={loading}
                                        className="h-12 px-6 flex items-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back to Home
                                    </Button>
                                )}
                                <div className="flex-1" />
                                <Button
                                    onClick={handleStepComplete}
                                    disabled={loading || !validateStep(step)}
                                    className="flex items-center gap-2 h-12 px-8 bg-gradient-to-r from-[#6C9A8B] to-[#5d8a7b] hover:from-[#5d8a7b] hover:to-[#4e7a6a]"
                                >
                                    {step === 3 ? (
                                        <>
                                            {loading ? 'Creating Store...' : 'Create Store'}
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    ) : (
                                        <>
                                            Next
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Footer */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>
                            By creating a store, you agree to our{' '}
                            <a href="/terms" className="text-[#6C9A8B] hover:underline font-medium">
                                Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="/privacy" className="text-[#6C9A8B] hover:underline font-medium">
                                Privacy Policy
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}