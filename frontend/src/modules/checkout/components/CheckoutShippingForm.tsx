import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useForm } from 'react-hook-form';

interface ShippingData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    shippingMethod: string;
}

interface CheckoutShippingFormProps {
    onProceed: (data: ShippingData) => void;
    onBack: () => void;
    loading?: boolean;
    initialData?: Partial<ShippingData>;
}

const CheckoutShippingForm: React.FC<CheckoutShippingFormProps> = ({
    onProceed,
    onBack,
    loading = false,
    initialData = {}
}) => {
    const { register, handleSubmit, formState: { errors } } = useForm<ShippingData>({
        defaultValues: {
            firstName: initialData.firstName || '',
            lastName: initialData.lastName || '',
            email: initialData.email || '',
            phone: initialData.phone || '',
            address: initialData.address || '',
            city: initialData.city || '',
            state: initialData.state || '',
            zipCode: initialData.zipCode || '',
            country: initialData.country || 'NG',
            shippingMethod: initialData.shippingMethod || 'standard'
        }
    });

    const onSubmit = (data: ShippingData) => {
        onProceed(data);
    };

    return (
        <div className="checkout-shipping-form">
            <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">First Name *</label>
                        <Input
                            {...register('firstName', { required: 'First name is required' })}
                            className={errors.firstName ? 'border-red-500' : ''}
                        />
                        {errors.firstName && (
                            <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Last Name *</label>
                        <Input
                            {...register('lastName', { required: 'Last name is required' })}
                            className={errors.lastName ? 'border-red-500' : ''}
                        />
                        {errors.lastName && (
                            <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email *</label>
                        <Input
                            type="email"
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Invalid email address'
                                }
                            })}
                            className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Phone *</label>
                        <Input
                            {...register('phone', { required: 'Phone number is required' })}
                            className={errors.phone ? 'border-red-500' : ''}
                        />
                        {errors.phone && (
                            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Address *</label>
                    <Input
                        {...register('address', { required: 'Address is required' })}
                        className={errors.address ? 'border-red-500' : ''}
                    />
                    {errors.address && (
                        <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">City *</label>
                        <Input
                            {...register('city', { required: 'City is required' })}
                            className={errors.city ? 'border-red-500' : ''}
                        />
                        {errors.city && (
                            <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">State *</label>
                        <Input
                            {...register('state', { required: 'State is required' })}
                            className={errors.state ? 'border-red-500' : ''}
                        />
                        {errors.state && (
                            <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                        <Input
                            {...register('zipCode', { required: 'ZIP code is required' })}
                            className={errors.zipCode ? 'border-red-500' : ''}
                        />
                        {errors.zipCode && (
                            <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Country *</label>
                    <select
                        {...register('country', { required: 'Country is required' })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="NG">Nigeria</option>
                        <option value="GH">Ghana</option>
                        <option value="KE">Kenya</option>
                        <option value="ZA">South Africa</option>
                        <option value="EG">Egypt</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Shipping Method *</label>
                    <select
                        {...register('shippingMethod', { required: 'Shipping method is required' })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="standard">Standard Delivery (5-7 days) - Free</option>
                        <option value="express">Express Delivery (2-3 days) - ₦2,000</option>
                        <option value="overnight">Overnight Delivery (1 day) - ₦5,000</option>
                    </select>
                </div>

                <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
                        Back to Cart
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? 'Processing...' : 'Continue to Payment'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CheckoutShippingForm;