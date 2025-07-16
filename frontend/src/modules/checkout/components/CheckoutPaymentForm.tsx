import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';

interface PaymentData {
    paymentMethod: string;
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardholderName?: string;
    saveCard?: boolean;
}

interface CheckoutPaymentFormProps {
    onProceed: (data: PaymentData) => void;
    onBack: () => void;
    loading?: boolean;
    totalAmount: number;
}

const CheckoutPaymentForm: React.FC<CheckoutPaymentFormProps> = ({
    onProceed,
    onBack,
    loading = false,
    totalAmount
}) => {
    const [selectedMethod, setSelectedMethod] = useState('card');
    const { register, handleSubmit, formState: { errors } } = useForm<PaymentData>();

    const onSubmit = (data: PaymentData) => {
        onProceed({ ...data, paymentMethod: selectedMethod });
    };

    return (
        <div className="checkout-payment-form">
            <h2 className="text-2xl font-bold mb-6">Payment Information</h2>

            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold">₦{totalAmount.toLocaleString()}</span>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Payment Method</h3>
                <div className="space-y-3">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer">
                        <input
                            type="radio"
                            value="card"
                            checked={selectedMethod === 'card'}
                            onChange={(e) => setSelectedMethod(e.target.value)}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium">Credit/Debit Card</div>
                            <div className="text-sm text-gray-600">Visa, Mastercard, Verve</div>
                        </div>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg cursor-pointer">
                        <input
                            type="radio"
                            value="transfer"
                            checked={selectedMethod === 'transfer'}
                            onChange={(e) => setSelectedMethod(e.target.value)}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium">Bank Transfer</div>
                            <div className="text-sm text-gray-600">Direct bank transfer</div>
                        </div>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg cursor-pointer">
                        <input
                            type="radio"
                            value="paystack"
                            checked={selectedMethod === 'paystack'}
                            onChange={(e) => setSelectedMethod(e.target.value)}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium">Paystack</div>
                            <div className="text-sm text-gray-600">Pay with Paystack</div>
                        </div>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg cursor-pointer">
                        <input
                            type="radio"
                            value="flutterwave"
                            checked={selectedMethod === 'flutterwave'}
                            onChange={(e) => setSelectedMethod(e.target.value)}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium">Flutterwave</div>
                            <div className="text-sm text-gray-600">Pay with Flutterwave</div>
                        </div>
                    </label>
                </div>
            </div>

            {selectedMethod === 'card' && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Cardholder Name *</label>
                        <Input
                            {...register('cardholderName', { required: 'Cardholder name is required' })}
                            className={errors.cardholderName ? 'border-red-500' : ''}
                        />
                        {errors.cardholderName && (
                            <p className="text-red-500 text-sm mt-1">{errors.cardholderName.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Card Number *</label>
                        <Input
                            {...register('cardNumber', {
                                required: 'Card number is required',
                                pattern: {
                                    value: /^[0-9]{16}$/,
                                    message: 'Please enter a valid 16-digit card number'
                                }
                            })}
                            placeholder="1234 5678 9012 3456"
                            className={errors.cardNumber ? 'border-red-500' : ''}
                        />
                        {errors.cardNumber && (
                            <p className="text-red-500 text-sm mt-1">{errors.cardNumber.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Expiry Date *</label>
                            <Input
                                {...register('expiryDate', {
                                    required: 'Expiry date is required',
                                    pattern: {
                                        value: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
                                        message: 'Please enter date in MM/YY format'
                                    }
                                })}
                                placeholder="MM/YY"
                                className={errors.expiryDate ? 'border-red-500' : ''}
                            />
                            {errors.expiryDate && (
                                <p className="text-red-500 text-sm mt-1">{errors.expiryDate.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">CVV *</label>
                            <Input
                                {...register('cvv', {
                                    required: 'CVV is required',
                                    pattern: {
                                        value: /^[0-9]{3,4}$/,
                                        message: 'Please enter a valid CVV'
                                    }
                                })}
                                placeholder="123"
                                className={errors.cvv ? 'border-red-500' : ''}
                            />
                            {errors.cvv && (
                                <p className="text-red-500 text-sm mt-1">{errors.cvv.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            {...register('saveCard')}
                            className="mr-2"
                        />
                        <label className="text-sm">Save this card for future purchases</label>
                    </div>
                </form>
            )}

            <div className="flex gap-4">
                <Button variant="outline" onClick={onBack} disabled={loading}>
                    Back to Shipping
                </Button>
                <Button
                    onClick={selectedMethod === 'card' ? handleSubmit(onSubmit) : () => onProceed({ paymentMethod: selectedMethod })}
                    disabled={loading}
                    className="flex-1"
                >
                    {loading ? 'Processing...' : 'Complete Order'}
                </Button>
            </div>
        </div>
    );
};

export default CheckoutPaymentForm;