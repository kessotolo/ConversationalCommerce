'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Heart, Bell, Gift } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface CustomerOnboardingProps {
    merchantName: string;
    merchantId: string;
    onComplete: (preferences: CustomerPreferences) => void;
    onSkip: () => void;
    className?: string;
}

interface CustomerPreferences {
    email?: string;
    notifications: {
        newProducts: boolean;
        sales: boolean;
        orderUpdates: boolean;
    };
    interests: string[];
}

const INTEREST_OPTIONS = [
    { id: 'electronics', label: 'Electronics', icon: '📱' },
    { id: 'fashion', label: 'Fashion & Style', icon: '👗' },
    { id: 'home', label: 'Home & Living', icon: '🏠' },
    { id: 'beauty', label: 'Beauty & Health', icon: '💄' },
    { id: 'books', label: 'Books & Media', icon: '📚' },
    { id: 'sports', label: 'Sports & Fitness', icon: '⚽' },
    { id: 'food', label: 'Food & Beverages', icon: '🍕' },
    { id: 'art', label: 'Art & Crafts', icon: '🎨' },
];

/**
 * Customer onboarding modal for first-time storefront visitors
 *
 * Features:
 * - Welcome message with merchant branding
 * - Optional email collection
 * - Notification preferences
 * - Interest selection for personalization
 * - Mobile-first responsive design
 * - Accessibility support
 * - LocalStorage integration for persistence
 */
export function CustomerOnboarding({
    merchantName,
    merchantId,
    onComplete,
    onSkip,
    className
}: CustomerOnboardingProps): JSX.Element {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [step, setStep] = useState<'welcome' | 'preferences' | 'interests'>('welcome');
    const [preferences, setPreferences] = useState<CustomerPreferences>({
        email: '',
        notifications: {
            newProducts: true,
            sales: true,
            orderUpdates: true
        },
        interests: []
    });

    // Check if user has already been onboarded
    useEffect(() => {
        const hasOnboarded = localStorage.getItem(`customer-onboarded-${merchantId}`);
        if (!hasOnboarded) {
            // Show modal after a brief delay for better UX
            const timer = setTimeout(() => {
                setShowModal(true);
            }, 1000);

            return () => clearTimeout(timer);
        }
        // Return a no-op function if no cleanup needed
        return () => { };
    }, [merchantId]);

    const handleEmailChange = (email: string): void => {
        setPreferences(prev => ({ ...prev, email }));
    };

    const handleNotificationChange = (key: keyof CustomerPreferences['notifications'], value: boolean): void => {
        setPreferences(prev => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value }
        }));
    };

    const handleInterestToggle = (interestId: string): void => {
        setPreferences(prev => ({
            ...prev,
            interests: prev.interests.includes(interestId)
                ? prev.interests.filter(id => id !== interestId)
                : [...prev.interests, interestId]
        }));
    };

    const handleComplete = (): void => {
        // Mark as onboarded
        localStorage.setItem(`customer-onboarded-${merchantId}`, 'true');

        // Save preferences
        if (preferences.email || preferences.interests.length > 0) {
            localStorage.setItem(`customer-preferences-${merchantId}`, JSON.stringify(preferences));
        }

        setShowModal(false);
        onComplete(preferences);
    };

    const handleSkip = (): void => {
        // Mark as onboarded even if skipped
        localStorage.setItem(`customer-onboarded-${merchantId}`, 'true');
        setShowModal(false);
        onSkip();
    };

    const nextStep = (): void => {
        if (step === 'welcome') {
            setStep('preferences');
        } else if (step === 'preferences') {
            setStep('interests');
        } else {
            handleComplete();
        }
    };

    const prevStep = (): void => {
        if (step === 'interests') {
            setStep('preferences');
        } else if (step === 'preferences') {
            setStep('welcome');
        }
    };

    const stepTitles = {
        welcome: `Welcome to ${merchantName}!`,
        preferences: 'Stay Updated',
        interests: 'Tell Us What You Love'
    };

    const stepDescriptions = {
        welcome: 'Discover amazing products and enjoy a personalized shopping experience.',
        preferences: 'Get notified about new products, sales, and order updates.',
        interests: 'Help us show you products you will love by selecting your interests.'
    };

    if (!showModal) return <div className={className} />;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <div className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                <Card className="relative">
                    <CardHeader className="text-center pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <CardTitle id="onboarding-title" className="text-xl font-bold mb-2">
                                    {stepTitles[step]}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    {stepDescriptions[step]}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSkip}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label="Close onboarding"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex space-x-2 mb-4">
                            {['welcome', 'preferences', 'interests'].map((stepName, index) => (
                                <div
                                    key={stepName}
                                    className={`h-2 flex-1 rounded-full transition-colors ${stepName === step
                                        ? 'bg-blue-500'
                                        : index < ['welcome', 'preferences', 'interests'].indexOf(step)
                                            ? 'bg-blue-200'
                                            : 'bg-gray-200'
                                        }`}
                                    role="progressbar"
                                    aria-valuenow={index + 1}
                                    aria-valuemax={3}
                                    aria-label={`Step ${index + 1} of 3`}
                                />
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                        {/* Welcome Step */}
                        {step === 'welcome' && (
                            <div className="text-center space-y-6 animate-in slide-in-from-right-2 duration-300">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                    <ShoppingBag className="h-8 w-8 text-blue-600" />
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
                                            <span className="text-gray-600">Save Favorites</span>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <Bell className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                            <span className="text-gray-600">Get Notified</span>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <Gift className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                            <span className="text-gray-600">Exclusive Deals</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Preferences Step */}
                        {step === 'preferences' && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-2">
                                            Email (Optional)
                                        </label>
                                        <Input
                                            id="email-input"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={preferences.email}
                                            onChange={(e) => handleEmailChange(e.target.value)}
                                            aria-describedby="email-description"
                                        />
                                        <p id="email-description" className="text-xs text-gray-500 mt-1">
                                            We'll only send you updates you choose below
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-gray-700">Notification Preferences</p>

                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="new-products"
                                                    checked={preferences.notifications.newProducts}
                                                    onCheckedChange={(checked) => handleNotificationChange('newProducts', !!checked)}
                                                />
                                                <label htmlFor="new-products" className="text-sm text-gray-700">
                                                    New product launches
                                                </label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="sales"
                                                    checked={preferences.notifications.sales}
                                                    onCheckedChange={(checked) => handleNotificationChange('sales', !!checked)}
                                                />
                                                <label htmlFor="sales" className="text-sm text-gray-700">
                                                    Sales and discounts
                                                </label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="order-updates"
                                                    checked={preferences.notifications.orderUpdates}
                                                    onCheckedChange={(checked) => handleNotificationChange('orderUpdates', !!checked)}
                                                />
                                                <label htmlFor="order-updates" className="text-sm text-gray-700">
                                                    Order updates
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Interests Step */}
                        {step === 'interests' && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                                <div className="grid grid-cols-2 gap-3">
                                    {INTEREST_OPTIONS.map((interest) => (
                                        <button
                                            key={interest.id}
                                            onClick={() => handleInterestToggle(interest.id)}
                                            className={`p-3 rounded-lg border text-left transition-all ${preferences.interests.includes(interest.id)
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            aria-pressed={preferences.interests.includes(interest.id)}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">{interest.icon}</span>
                                                <span className="text-sm font-medium">{interest.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {preferences.interests.length > 0 && (
                                    <div className="text-center">
                                        <Badge variant="secondary" className="text-xs">
                                            {preferences.interests.length} interest{preferences.interests.length !== 1 ? 's' : ''} selected
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-4 border-t">
                            <Button
                                variant="ghost"
                                onClick={step === 'welcome' ? handleSkip : prevStep}
                                className="text-gray-600"
                            >
                                {step === 'welcome' ? 'Skip' : 'Back'}
                            </Button>

                            <Button onClick={nextStep} className="px-6">
                                {step === 'interests' ? 'Get Started' : 'Next'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}