'use client';

import { useState, useEffect } from 'react';
import { productService } from '@/lib/api';
import ProductCard from '@/components/storefront/ProductCard';
import { useCart } from '@/lib/cart';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    created_at: string;
    is_available: boolean;
}

interface StorePageClientProps {
    merchantId: string;
}

export default function StorePageClient({ merchantId }: StorePageClientProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addItem } = useCart();

    useEffect(() => {
        fetchProducts();
    }, [merchantId]);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await productService.getProducts();
            setProducts(response.data);
        } catch (error: any) {
            console.error('Error fetching products:', error);
            setError('Failed to load products. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToCart = (product: Product) => {
        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url
        });
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4">
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Loading products...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>{error}</p>
                    <button 
                        onClick={fetchProducts}
                        className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Store Products</h1>
            
            {products.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">No products available at this time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                        <ProductCard 
                            key={product.id}
                            product={product}
                            onAddToCart={() => handleAddToCart(product)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
