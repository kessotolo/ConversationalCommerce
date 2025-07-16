'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, ShoppingCart, CreditCard, MapPin, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

import CheckoutCartReview from './CheckoutCartReview';
import CheckoutShippingForm from './CheckoutShippingForm';
import CheckoutPaymentForm from './CheckoutPaymentForm';
import CheckoutConfirmation from './CheckoutConfirmation';
import { useCartStore } from '@/modules/cart/services/useCartStore';
import { useTenant } from '@/contexts/TenantContext';
import mobileOptimizationService from '@/services/MobileOptimizationService';

/**
 * Business Context:
 * - "Merchant" = Business customer using the platform to run their online store
 * - "Customer" = End user shopping on the merchant's storefront
 * - Checkout flow converts cart items into completed orders with payment processing
 * - Multi-step process optimized for mobile and low-connectivity environments
 * - Payment integration with African-focused payment methods (mobile money, card, cash on delivery)
 */

export interface CheckoutStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    completed: boolean;
    active: boolean;
}

export interface ShippingAddress {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
    apartment?: string;
    landmark?: string;
    notes?: string;
}

export interface PaymentDetails {
    method: 'mobile_money' | 'card' | 'cash_on_delivery';
    phoneNumber?: string;
    cardToken?: string;
    billingAddress?: ShippingAddress;
}

export interface CheckoutData {
    customerInfo: {
        name: string;
        email?: string;
        phone: string;
    };
    shippingAddress: ShippingAddress;
    paymentDetails: PaymentDetails;
    orderNotes?: string;
}

interface CheckoutOrchestratorProps {
    merchantId: string;
    onOrderComplete?: (orderId: string, orderNumber: string) => void;
    className?: string;
}

/**
 * Checkout Orchestrator Component
 *
 * Comprehensive multi-step checkout flow providing customers with:
 * - Cart review and item management
 * - Shipping address collection and validation
 * - Payment method selection and processing
 * - Order confirmation and tracking setup
 *
 * Features:
 * - Mobile-first responsive design
 * - Progressive enhancement for slow connections
 * - Local storage persistence for incomplete checkouts
 * - Real-time validation and error handling
 * - Multiple payment options (mobile money, card, cash on delivery)
 * - Address book integration
 * - Order tracking setup
 * - Accessibility compliant
 */
export default function CheckoutOrchestrator({
    merchantId,
    onOrderComplete,
    className = ''
}: CheckoutOrchestratorProps) {
    const router = useRouter();
    const { tenant } = useTenant();
    const { toast } = useToast();
    const { items: cartItems, clearCart, getTotal } = useCartStore();

    // State management
    const [currentStep, setCurrentStep] = useState(0);
    const [checkoutData, setCheckoutData] = useState<Partial<CheckoutData>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [orderNumber, setOrderNumber] = useState<string | null>(null);

    // Mobile optimization
    const deviceInfo = mobileOptimizationService.getDeviceInfo();
    const shouldUseSimplifiedUI = mobileOptimizationService.shouldUseSimplifiedUI();

    // Define checkout steps
    const steps: CheckoutStep[] = [
        {
            id: 'cart',
            title: 'Review Cart',
            description: 'Review your items and quantities',
            icon: <ShoppingCart className="h-5 w-5" />,
            completed: false,
            active: currentStep === 0,
        },
        {
            id: 'shipping',
            title: 'Shipping',
            description: 'Enter delivery address',
            icon: <MapPin className="h-5 w-5" />,
            completed: false,
            active: currentStep === 1,
        },
        {
            id: 'payment',
            title: 'Payment',
            description: 'Choose payment method',
            icon: <CreditCard className="h-5 w-5" />,
            completed: false,
            active: currentStep === 2,
        },
        {
            id: 'confirmation',
            title: 'Confirmation',
            description: 'Order complete',
            icon: <CheckCircle className="h-5 w-5" />,
            completed: false,
            active: currentStep === 3,
        },
    ];

    // Update step completion status
    const updatedSteps = steps.map((step, index) => ({
        ...step,
        completed: index < currentStep,
        active: index === currentStep,
    }));

    // Calculate progress percentage
    const progressPercentage = ((currentStep + 1) / steps.length) * 100;

    // Load saved checkout data from localStorage
    useEffect(() => {
        const savedData = localStorage.getItem(`checkout_${merchantId}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setCheckoutData(parsed);
            } catch (err) {
                console.warn('Failed to load saved checkout data:', err);
            }
        }
    }, [merchantId]);

    // Save checkout data to localStorage
    const saveCheckoutData = useCallback((data: Partial<CheckoutData>) => {
        const updatedData = { ...checkoutData, ...data };
        setCheckoutData(updatedData);
        localStorage.setItem(`checkout_${merchantId}`, JSON.stringify(updatedData));
    }, [checkoutData, merchantId]);

    // Redirect if cart is empty
    useEffect(() => {
        if (cartItems.length === 0 && currentStep < 3) {
            router.push(`/store/${merchantId}`);
        }
    }, [cartItems.length, currentStep, merchantId, router]);

    // Navigation handlers
    const goToNextStep = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
            setError(null);
        }
    }, [currentStep, steps.length]);

    const goToPreviousStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            setError(null);
        }
    }, [currentStep]);

    // Step completion handlers
    const handleCartReviewComplete = useCallback(() => {
        goToNextStep();
    }, [goToNextStep]);

    const handleShippingComplete = useCallback((shippingData: { customerInfo: any; shippingAddress: ShippingAddress }) => {
        saveCheckoutData(shippingData);
        goToNextStep();
    }, [saveCheckoutData, goToNextStep]);

    const handlePaymentComplete = useCallback((paymentData: { paymentDetails: PaymentDetails }) => {
        saveCheckoutData(paymentData);
        goToNextStep();
    }, [saveCheckoutData, goToNextStep]);

    // Process order
    const processOrder = useCallback(async () => {
        if (!checkoutData.customerInfo || !checkoutData.shippingAddress || !checkoutData.paymentDetails) {
            setError('Missing required checkout information');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Calculate totals
            const subtotal = getTotal();
            const shippingCost = 0; // Calculate based on address/method
            const taxAmount = subtotal * 0.16; // 16% VAT for Kenya
            const totalAmount = subtotal + shippingCost + taxAmount;

            // Create order request
            const orderRequest = {
                customer: {
                    name: checkoutData.customerInfo.name,
                    email: checkoutData.customerInfo.email,
                    phone: checkoutData.customerInfo.phone,
                    is_guest: true,
                },
                items: cartItems.map(item => ({
                    id: item.id,
                    product_id: item.id,
                    product_name: item.name,
                    quantity: item.quantity,
                    unit_price: {
                        amount: item.price,
                        currency: 'KES',
                    },
                    total_price: {
                        amount: item.price * item.quantity,
                        currency: 'KES',
                    },
                    variant_id: '',
                    variant_name: '',
                    image_url: item.image_url,
                })),
                shipping: {
                    address: checkoutData.shippingAddress,
                    method: 'rider', // Default shipping method
                    shipping_cost: {
                        amount: shippingCost,
                        currency: 'KES',
                    },
                    notes: checkoutData.shippingAddress.notes,
                },
                payment: {
                    method: checkoutData.paymentDetails.method,
                    phone_number: checkoutData.paymentDetails.phoneNumber,
                },
                source: 'website',
                notes: checkoutData.orderNotes,
                metadata: {
                    device_info: deviceInfo,
                    checkout_timestamp: new Date().toISOString(),
                },
                idempotency_key: crypto.randomUUID(),
                channel: 'web',
            };

            // Submit order to API
            const response = await fetch(`/api/v1/storefront/${merchantId}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderRequest),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create order');
            }

            const orderData = await response.json();
            setOrderId(orderData.id);
            setOrderNumber(orderData.order_number);

            // Clear cart and saved checkout data
            clearCart();
            localStorage.removeItem(`checkout_${merchantId}`);

            // Go to confirmation step
            setCurrentStep(3);

            // Notify parent component
            if (onOrderComplete) {
                onOrderComplete(orderData.id, orderData.order_number);
            }

            toast({
                title: 'Order placed successfully!',
                description: `Your order #${orderData.order_number} has been confirmed.`,
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to process order';
            setError(errorMessage);
            toast({
                title: 'Order failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    }, [checkoutData, cartItems, getTotal, merchantId, clearCart, onOrderComplete, toast, deviceInfo]);

    // Render current step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <CheckoutCartReview
                        items={cartItems}
                        onContinue={handleCartReviewComplete}
                        onUpdateQuantity={(itemId: string, quantity: number) => {
                            // Handle quantity updates through cart store
                        }}
                        onRemoveItem={(itemId: string) => {
                            // Handle item removal through cart store
                        }}
                        isSimplified={shouldUseSimplifiedUI}
                    />
                );

            case 1:
                return (
                    <CheckoutShippingForm
                        initialData={{
                            customerInfo: checkoutData.customerInfo,
                            shippingAddress: checkoutData.shippingAddress,
                        }}
                        onComplete={handleShippingComplete}
                        onBack={goToPreviousStep}
                        isSimplified={shouldUseSimplifiedUI}
                    />
                );

            case 2:
                return (
                    <CheckoutPaymentForm
                        orderTotal={getTotal()}
                        initialData={checkoutData.paymentDetails}
                        onComplete={handlePaymentComplete}
                        onBack={goToPreviousStep}
                        onSubmitOrder={processOrder}
                        isProcessing={isProcessing}
                        isSimplified={shouldUseSimplifiedUI}
                    />
                );

            case 3:
                return (
                    <CheckoutConfirmation
                        orderId={orderId || ''}
                        orderNumber={orderNumber || ''}
                        customerEmail={checkoutData.customerInfo?.email}
                        onContinueShopping={() => router.push(`/store/${merchantId}`)}
                        onTrackOrder={() => router.push(`/store/${merchantId}/orders/${orderId}`)}
                    />
                );

            default:
                return null;
        }
    };

    if (cartItems.length === 0 && currentStep < 3) {
        return (
            <div className={`max-w-md mx-auto p-6 text-center ${className}`}>
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-4">Add some items to your cart to continue with checkout.</p>
                <Button onClick={() => router.push(`/store/${merchantId}`)}>
                    Continue Shopping
                </Button>
            </div>
        );
    }

    return (
        <div className={`max-w-4xl mx-auto p-4 sm:p-6 ${className}`}>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Checkout</h1>
                <p className="text-muted-foreground">Complete your order in {steps.length} easy steps</p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                        Step {currentStep + 1} of {steps.length}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {Math.round(progressPercentage)}% complete
                    </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Step indicators */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {updatedSteps.map((step, index) => (
                        <div key={step.id} className="flex flex-col items-center">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2 ${step.completed
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : step.active
                                        ? 'bg-blue-500 border-blue-500 text-white'
                                        : 'bg-gray-100 border-gray-300 text-gray-400'
                                    }`}
                            >
                                {step.completed ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    step.icon
                                )}
                            </div>
                            <div className="text-center">
                                <p className={`text-xs sm:text-sm font-medium ${step.active ? 'text-blue-600' : step.completed ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                    {step.title}
                                </p>
                                {!shouldUseSimplifiedUI && (
                                    <p className="text-xs text-gray-400 hidden sm:block">
                                        {step.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Error display */}
            {error && (
                <Card className="mb-6 border-destructive">
                    <CardContent className="p-4">
                        <p className="text-destructive text-sm">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Step content */}
            <div className="mb-6">
                {renderStepContent()}
            </div>

            {/* Mobile-friendly navigation */}
            {currentStep > 0 && currentStep < 3 && (
                <div className="flex justify-between items-center pt-6 border-t">
                    <Button
                        variant="outline"
                        onClick={goToPreviousStep}
                        className="flex items-center gap-2"
                        disabled={isProcessing}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {isProcessing && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}