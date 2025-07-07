import React from 'react';

interface StoreContentProps {
    merchantId: string;
    className?: string;
}

export default function StoreContent({ merchantId, className }: StoreContentProps) {
    return (
        <div className={className}>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Store Content</h1>
                <p className="text-gray-600">
                    Store content for merchant: {merchantId}
                </p>
                <div className="mt-8">
                    <p className="text-sm text-gray-500">
                        This is a placeholder component. Implement your store content here.
                    </p>
                </div>
            </div>
        </div>
    );
}