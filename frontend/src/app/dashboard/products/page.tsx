'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  ChevronRight,
  Trash2,
  Copy
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/Button';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
  category: string;
}

// Mock products data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Organic Bananas',
    price: 1.99,
    image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFuYW5hfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60',
    description: 'Fresh organic bananas from local farms.',
    inStock: true,
    category: 'Fruits'
  },
  {
    id: '2',
    name: 'Premium Coffee Beans',
    price: 12.99,
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Y29mZmVlJTIwYmVhbnN8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
    description: 'Freshly roasted premium coffee beans.',
    inStock: true,
    category: 'Beverages'
  },
  {
    id: '3',
    name: 'Whole Wheat Bread',
    price: 3.49,
    image: 'https://images.unsplash.com/photo-1586444248892-4aa5712a2660?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YnJlYWR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
    description: 'Freshly baked whole wheat bread.',
    inStock: true,
    category: 'Bakery'
  }
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'web'>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Categories derived from products
  const categories = Array.from(new Set(products.map(p => p.category)));
  
  // Filter products based on search, category and channel
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? product.category === filterCategory : true;
    // In a real implementation, this would filter based on product channel visibility
    // Here we're just simulating it with a basic condition
    const matchesChannel = channelFilter === 'all' ? true : true;
    return matchesSearch && matchesCategory && matchesChannel;
  });
  
  // Delete product handler
  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      // In production, this would call an API endpoint
      setIsLoading(true);
      setTimeout(() => {
        setProducts(products.filter(p => p.id !== id));
        setIsLoading(false);
      }, 500);
    }
  };
  
  // Duplicate product handler
  const handleDuplicateProduct = (id: string) => {
    const productToDuplicate = products.find(p => p.id === id);
    if (productToDuplicate) {
      setIsLoading(true);
      // In production, this would call an API endpoint
      setTimeout(() => {
        const newProduct = {
          ...productToDuplicate,
          id: `${parseInt(productToDuplicate.id) + 100}`, // Just for demo purposes
          name: `${productToDuplicate.name} (Copy)`
        };
        setProducts([...products, newProduct]);
        setIsLoading(false);
      }, 500);
    }
  };
  
  // Bulk selection handler
  const toggleSelectProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };
  
  // Bulk delete handler
  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
      setIsLoading(true);
      // In production, this would call an API endpoint
      setTimeout(() => {
        setProducts(products.filter(p => !selectedProducts.includes(p.id)));
        setSelectedProducts([]);
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 px-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Products</h1>
          <Link href="/dashboard/products/add" className="bg-primary text-white p-2 rounded-full shadow-lg">
            <Plus size={24} />
          </Link>
        </div>
        
        {/* Channel Visibility Toggle */}
        <div className="flex overflow-x-auto pb-2 bg-muted/20 p-1 rounded-md">
          <button
            onClick={() => setChannelFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${channelFilter === 'all' ? 'bg-primary text-white' : 'text-gray-700'}`}
          >
            All Channels
          </button>
          <button
            onClick={() => setChannelFilter('whatsapp')}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${channelFilter === 'whatsapp' ? 'bg-primary text-white' : 'text-gray-700'}`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setChannelFilter('web')}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${channelFilter === 'web' ? 'bg-primary text-white' : 'text-gray-700'}`}
          >
            Web
          </button>
        </div>
        
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-md"
            />
          </div>
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-4 pr-8 py-2 border rounded-md appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400" size={16} />
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md shadow-sm">
            <span className="text-sm font-medium">{selectedProducts.length} products selected</span>
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete} 
                disabled={isLoading}
                className="flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedProducts([])} 
                className="flex items-center"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Products List with Swipe Actions */}
        <div className="space-y-1 pb-16">
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded-md shadow-lg">
                <p>Processing...</p>
              </div>
            </div>
          )}
          
          {filteredProducts.length === 0 ? (
            <div className="text-center p-8 border rounded-md bg-white">
              <p>No products found. Try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onDelete={handleDeleteProduct}
                  onDuplicate={handleDuplicateProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
