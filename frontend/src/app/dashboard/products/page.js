/**
 * Dashboard Products Page - Client Component
 * 
 * This component has been converted from TypeScript to JavaScript to ensure
 * compatibility with Next.js 15's type system, particularly for dynamic routes.
 * 
 * ARCHITECTURAL DECISIONS:
 * - Client component approach maintained for dashboard functionality
 * - State management with React hooks for products CRUD operations
 * - API service pattern using the productService abstraction
 * - Mobile-first responsive design with Tailwind CSS
 * 
 * This implementation preserves the vision of your product as a conversational
 * commerce platform while addressing technical compatibility issues.
 */

'use client';

import { useState, useEffect } from 'react';
import ProductForm from '@/components/ProductForm';
import ProductList from '@/components/ProductList';
import { productService } from '@/lib/api';

export default function ProductsPage() {
    // State management for products data
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch products on component mount
    useEffect(() => {
        fetchProducts();
    }, []);

    // API function to get products
    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const response = await productService.getProducts();
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Failed to load products. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    // Create a new product
    const handleAddProduct = async (product) => {
        try {
            const response = await productService.createProduct(product);
            setProducts([...products, response.data]);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error adding product:', error);
            return { success: false, error: error.message };
        }
    };

    // Update an existing product
    const handleUpdateProduct = async (id, product) => {
        try {
            const response = await productService.updateProduct(id, product);
            setProducts(products.map(p => p.id === id ? response.data : p));
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error updating product:', error);
            return { success: false, error: error.message };
        }
    };

    // Delete a product
    const handleDeleteProduct = async (id) => {
        try {
            await productService.deleteProduct(id);
            setProducts(products.filter(p => p.id !== id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting product:', error);
            return { success: false, error: error.message };
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col space-y-8">
                {/* Product Form Section */}
                <section className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Add New Product</h2>
                    <ProductForm onSubmit={handleAddProduct} />
                </section>

                {/* Product List Section */}
                <section className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Your Products</h2>
                    <ProductList 
                        products={products}
                        isLoading={isLoading}
                        error={error}
                        onUpdate={handleUpdateProduct}
                        onDelete={handleDeleteProduct}
                    />
                </section>
            </div>
        </div>
    );
}
