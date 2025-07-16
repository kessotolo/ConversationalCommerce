import React from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
import { CheckCircle } from 'lucide-react';

interface OrderData {
    id: string;
    orderNumber: string;
    items: Array<{
        id: string;
        name: string;
        quantity: number;
        price: number;
        image_url?: string;
    }>;
    shippingAddress: {
        firstName: string;
        lastName: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    paymentMethod: string;
    totalAmount: number;
    estimatedDelivery: string;
}

interface CheckoutConfirmationProps {
    order: OrderData;
    onContinueShopping: () => void;
    onViewOrder: () => void;
}

const CheckoutConfirmation: React.FC<CheckoutConfirmationProps> = ({
    order,
    onContinueShopping,
    onViewOrder
}) => {
    return (
        <div className="checkout-confirmation max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
                <p className="text-gray-600">Thank you for your purchase. Your order has been received and is being processed.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-medium">Order Number:</span>
                        <p className="font-mono">{order.orderNumber}</p>
                    </div>
                    <div>
                        <span className="font-medium">Estimated Delivery:</span>
                        <p>{order.estimatedDelivery}</p>
                    </div>
                </div>
            </div>

            <div className="border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Order Items</h3>
                <div className="space-y-4">
                    {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                            {item.image_url && (
                                <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded"
                                />
                            )}
                            <div className="flex-1">
                                <h4 className="font-medium">{item.name}</h4>
                                <p className="text-gray-600">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                </div>
            </div>

            <div className="border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Shipping Address</h3>
                <div className="text-gray-600">
                    <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                    <p>{order.shippingAddress.address}</p>
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                    <p>{order.shippingAddress.country}</p>
                </div>
            </div>

            <div className="border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Payment Method</h3>
                <p className="text-gray-600 capitalize">{order.paymentMethod}</p>
            </div>

            <div className="text-center space-y-4">
                <p className="text-gray-600">
                    We'll send you a confirmation email with tracking information once your order ships.
                </p>

                <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={onContinueShopping}>
                        Continue Shopping
                    </Button>
                    <Button onClick={onViewOrder}>
                        View Order Details
                    </Button>
                </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
                <p>Need help? Contact our support team at support@yourstore.com</p>
            </div>
        </div>
    );
};

export default CheckoutConfirmation;