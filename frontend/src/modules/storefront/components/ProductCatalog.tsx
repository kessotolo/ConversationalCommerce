'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, SortAsc, Grid, List, ShoppingBag, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@/modules/product/models/product';
import type { Money } from '@/modules/core/models/base/money';
import type { Route } from 'next';

interface ProductCatalogProps {
    merchantId: string;
    products: Product[];
    onAddToCart: (product: Product, quantity: number) => void;
    onToggleWishlist: (productId: string) => void;
    wishlistItems: string[];
    isLoading?: boolean;
    className?: string;
}

interface FilterState {
    search: string;
    category: string;
    priceRange: 'all' | 'under-50' | '50-100' | '100-200' | 'over-200';
    sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest';
}

/**
 * Modern product catalog component for customer storefront
 *
 * Features:
 * - Real-time search and filtering
 * - Price range filtering
 * - Category filtering
 * - Sort by multiple criteria
 * - Grid/list view toggle
 * - Add to cart functionality
 * - Wishlist integration
 * - Mobile-first responsive design
 * - Full accessibility support
 */
export function ProductCatalog({
    merchantId,
    products,
    onAddToCart,
    onToggleWishlist,
    wishlistItems,
    isLoading = false,
    className = ''
}: ProductCatalogProps): JSX.Element {
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        category: 'all',
        priceRange: 'all',
        sortBy: 'name'
    });
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // Memoized filtered and sorted products
    const filteredProducts = useMemo(() => {
        let filtered = products.filter(product => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    product.name.toLowerCase().includes(searchLower) ||
                    product.description?.toLowerCase().includes(searchLower) ||
                    product.categories?.[0]?.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Category filter
            if (filters.category !== 'all' && product.categories?.[0] !== filters.category) {
                return false;
            }

            // Price range filter
            if (filters.priceRange !== 'all') {
                const price = typeof product.price === 'number' ? product.price : parseFloat(product.price.toString());
                switch (filters.priceRange) {
                    case 'under-50':
                        if (price >= 50) return false;
                        break;
                    case '50-100':
                        if (price < 50 || price >= 100) return false;
                        break;
                    case '100-200':
                        if (price < 100 || price >= 200) return false;
                        break;
                    case 'over-200':
                        if (price < 200) return false;
                        break;
                }
            }

            return true;
        });

        // Sort products
        filtered.sort((a, b) => {
            switch (filters.sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'price-asc':
                    return (typeof a.price === 'number' ? a.price : parseFloat(a.price.toString())) -
                        (typeof b.price === 'number' ? b.price : parseFloat(b.price.toString()));
                case 'price-desc':
                    return (typeof b.price === 'number' ? b.price : parseFloat(b.price.toString())) -
                        (typeof a.price === 'number' ? a.price : parseFloat(a.price.toString()));
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                default:
                    return 0;
            }
        });

        return filtered;
    }, [products, filters]);

    // Get unique categories from products
    const categories = useMemo(() => {
        const uniqueCategories = Array.from(new Set(products.flatMap(p => p.categories || []).filter(Boolean)));
        return uniqueCategories.sort();
    }, [products]);

    const handleFilterChange = (key: keyof FilterState, value: string): void => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleQuantityChange = (productId: string, quantity: number): void => {
        setQuantities(prev => ({ ...prev, [productId]: Math.max(1, quantity) }));
    };

    const handleAddToCart = (product: Product): void => {
        const quantity = quantities[product.id] || 1;
        onAddToCart(product, quantity);
    };

    const formatPrice = (price: number | string): string => {
        const numPrice = typeof price === 'number' ? price : parseFloat(price.toString());
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(numPrice);
    };

    if (isLoading) {
        return (
            <div className={`space-y-6 ${className}`}>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="h-10 bg-gray-200 rounded animate-pulse flex-1"></div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse w-48"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-gray-200 h-80 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`} role="main" aria-label="Product catalog">
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="search"
                            placeholder="Search products..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="pl-10"
                            aria-label="Search products"
                        />
                    </div>

                    {/* Category Filter */}
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                        <SelectTrigger className="w-48" aria-label="Filter by category">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Price Range Filter */}
                    <Select value={filters.priceRange} onValueChange={(value) => handleFilterChange('priceRange', value as FilterState['priceRange'])}>
                        <SelectTrigger className="w-48" aria-label="Filter by price range">
                            <SelectValue placeholder="All Prices" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Prices</SelectItem>
                            <SelectItem value="under-50">Under $50</SelectItem>
                            <SelectItem value="50-100">$50 - $100</SelectItem>
                            <SelectItem value="100-200">$100 - $200</SelectItem>
                            <SelectItem value="over-200">Over $200</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Sort and View Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value as FilterState['sortBy'])}>
                            <SelectTrigger className="w-48" aria-label="Sort products">
                                <SortAsc className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name (A-Z)</SelectItem>
                                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                                <SelectItem value="newest">Newest First</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex rounded-lg border overflow-hidden">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                aria-label="Grid view"
                                className="rounded-none"
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                aria-label="List view"
                                className="rounded-none"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="text-sm text-gray-600">
                        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                    </div>
                </div>
            </div>

            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                </div>
            ) : (
                <div
                    className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                            : 'space-y-4'
                    }
                    role="grid"
                    aria-label="Products"
                >
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            merchantId={merchantId}
                            viewMode={viewMode}
                            quantity={quantities[product.id] || 1}
                            isInWishlist={wishlistItems.includes(product.id)}
                            onQuantityChange={(quantity) => handleQuantityChange(product.id, quantity)}
                            onAddToCart={() => handleAddToCart(product)}
                            onToggleWishlist={() => onToggleWishlist(product.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface ProductCardProps {
    product: Product;
    merchantId: string;
    viewMode: 'grid' | 'list';
    quantity: number;
    isInWishlist: boolean;
    onQuantityChange: (quantity: number) => void;
    onAddToCart: () => void;
    onToggleWishlist: () => void;
}

function ProductCard({
    product,
    merchantId,
    viewMode,
    quantity,
    isInWishlist,
    onQuantityChange,
    onAddToCart,
    onToggleWishlist
}: ProductCardProps): JSX.Element {
    const productUrl = `/store/${merchantId}/${product.id}` as Route;
    const formatPrice = (price: Money): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price.amount);
    };

    if (viewMode === 'list') {
        return (
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <Link href={productUrl} className="block w-24 h-24 flex-shrink-0">
                            <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                                {product.images[0]?.url ? (
                                    <Image
                                        src={product.images[0].url}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="96px"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </Link>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                                <Link href={productUrl} className="block">
                                    <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate">
                                        {product.name}
                                    </h3>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onToggleWishlist}
                                    aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                                >
                                    <Heart
                                        className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                                    />
                                </Button>
                            </div>

                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {product.description}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold text-gray-900">
                                    {formatPrice(product.price)}
                                </span>

                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
                                        className="w-16 h-8 text-center"
                                        aria-label="Quantity"
                                    />
                                    <Button
                                        onClick={onAddToCart}
                                        size="sm"
                                        className="flex items-center gap-1"
                                    >
                                        <ShoppingBag className="h-4 w-4" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="group hover:shadow-lg transition-all duration-200" role="gridcell">
            <CardContent className="p-0">
                <div className="relative">
                    <Link href={productUrl} className="block">
                        <div className="relative aspect-square bg-gray-100 overflow-hidden rounded-t-lg">
                            {product.images[0]?.url ? (
                                <Image
                                    src={product.images[0].url}
                                    alt={product.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingBag className="h-12 w-12 text-gray-400" />
                                </div>
                            )}
                        </div>
                    </Link>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleWishlist}
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        <Heart
                            className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                        />
                    </Button>

                    {product.categories?.[0] && (
                        <Badge className="absolute top-2 left-2" variant="secondary">
                            {product.categories[0]}
                        </Badge>
                    )}
                </div>

                <div className="p-4">
                    <Link href={productUrl} className="block mb-2">
                        <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                            {product.name}
                        </h3>
                    </Link>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-semibold text-gray-900">
                            {formatPrice(product.price)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center"
                            aria-label="Quantity"
                        />
                        <Button
                            onClick={onAddToCart}
                            className="flex-1 flex items-center justify-center gap-2"
                            size="sm"
                        >
                            <ShoppingBag className="h-4 w-4" />
                            Add to Cart
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}