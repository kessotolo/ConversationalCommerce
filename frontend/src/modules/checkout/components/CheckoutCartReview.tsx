import React from 'react';
import { CartItem } from '@/modules/cart/models/cart';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CheckoutCartReviewProps {
    items: CartItem[];
    onUpdateQuantity: (itemId: string, quantity: number) => void;
    onRemoveItem: (itemId: string) => void;
    onProceed: () => void;
    onBack?: () => void;
    loading?: boolean;
}

const CheckoutCartReview: React.FC<CheckoutCartReviewProps> = ({
    items,
    onUpdateQuantity,
    onRemoveItem,
    onProceed,
    onBack,
    loading = false
}) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    return (
        <div className="checkout-cart-review">
            <h2 className="text-2xl font-bold mb-6">Review Your Order</h2>

            {items.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500">Your cart is empty</p>
                </div>
            ) : (
                <>
                    <div className="space-y-4 mb-6">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                {item.image_url && (
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-20 h-20 object-cover rounded"
                                    />
                                )}

                                <div className="flex-1">
                                    <h3 className="font-medium">{item.name}</h3>
                                    <p className="text-gray-600">{formatCurrency(item.price)}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value))}
                                        className="w-20"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onRemoveItem(item.id)}
                                    >
                                        Remove
                                    </Button>
                                </div>

                                <div className="text-right">
                                    <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4 mb-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {onBack && (
                            <Button variant="outline" onClick={onBack} disabled={loading}>
                                Back
                            </Button>
                        )}
                        <Button
                            onClick={onProceed}
                            disabled={loading || items.length === 0}
                            className="flex-1"
                        >
                            {loading ? 'Processing...' : 'Continue to Shipping'}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CheckoutCartReview;