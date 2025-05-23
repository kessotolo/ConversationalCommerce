'use client';

import { useState, useEffect } from 'react';
import ProductForm from '@/components/ProductForm';
import ProductList from '@/components/ProductList';
import { apiClient } from '@/lib/api';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    created_at: string;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await apiClient.get('/products');
            setProducts(response.data);
        } catch (error: any) {
            console.error('Error fetching products:', error);
            setError(error.response?.data?.detail || 'Failed to fetch products. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProductCreated = (newProduct: Product) => {
        setProducts((prevProducts) => [newProduct, ...prevProducts]);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage your product catalog and share them with your customers.
                    </p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Product</h2>
                        <ProductForm onSubmit={handleProductCreated} />
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Your Products</h2>
                    <ProductList products={products} isLoading={isLoading} />
                </div>
            </div>
        </div>
    );
}