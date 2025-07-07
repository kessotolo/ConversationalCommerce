'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ShoppingCart, AlertCircle } from 'lucide-react';

import { productService } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    description?: string;
    category?: string;
    featured?: boolean;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [cartItems, setCartItems] = useState<string[]>([]);
    const { toast } = useToast();

    const handleAddToCart = (productId: string, productName: string) => {
        setCartItems((prev) => [...prev, productId]);
        toast({
            title: "Added to Cart",
            description: `${productName} has been added to your cart`,
        });
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await productService.getProducts();
                // Handle the proper response structure - products array is at response.data.products
                const productData = response.data?.products || response.data || [];
                setProducts(productData);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Failed to fetch products';
                setError(errorMessage);
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [toast]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading products...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
                    <p className="text-destructive">{error}</p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="mt-4"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">Products</h1>
                    {cartItems.length > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            {cartItems.length} items
                        </Badge>
                    )}
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <Card key={product.id} className="overflow-hidden">
                                <CardHeader className="p-0">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-muted flex items-center justify-center">
                                            <span className="text-muted-foreground">No image</span>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                                        {product.featured && (
                                            <Badge variant="default" className="ml-2">
                                                Featured
                                            </Badge>
                                        )}
                                    </div>
                                    {product.description && (
                                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                            {product.description}
                                        </p>
                                    )}
                                    {product.category && (
                                        <Badge variant="outline" className="mb-2">
                                            {product.category}
                                        </Badge>
                                    )}
                                    <p className="text-xl font-bold text-primary">
                                        ${product.price.toFixed(2)}
                                    </p>
                                </CardContent>
                                <CardFooter className="p-4 pt-0">
                                    <Button
                                        onClick={() => handleAddToCart(product.id, product.name)}
                                        className="w-full"
                                        disabled={cartItems.includes(product.id)}
                                    >
                                        {cartItems.includes(product.id) ? (
                                            <>
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                Added
                                            </>
                                        ) : (
                                            'Add to Cart'
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}