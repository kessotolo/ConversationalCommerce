import React from 'react';
import Image from 'next/image';
import { Edit, Trash2 } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    created_at: string;
    status?: 'active' | 'draft' | 'archived'; // Optional status
}

interface ProductListProps {
    products: Product[];
    isLoading?: boolean;
}

export default function ProductList({ products, isLoading = false }: ProductListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No products found. Add your first product!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl shadow border border-[#e6f0eb] flex flex-col">
                    <div className="flex items-center gap-4 p-4 border-b border-gray-100">
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            {product.image_url ? (
                                <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate font-sans">{product.name}</h3>
                            <p className="text-gray-500 text-sm truncate font-sans">{product.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[#6C9A8B] font-semibold font-sans">${product.price.toFixed(2)}</span>
                                {product.status && (
                                    <span className={
                                        product.status === 'active'
                                            ? 'bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold'
                                            : product.status === 'draft'
                                                ? 'bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold'
                                                : 'bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-semibold'
                                    }>
                                        {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-2">
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Edit">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1 rounded hover:bg-red-50 text-red-500" title="Delete">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}