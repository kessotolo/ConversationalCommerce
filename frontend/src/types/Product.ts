import * as React from 'react';
// @ts-nocheck
// DO NOT MODIFY: This file is manually maintained
// Product type definitions
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
  category: string;
  variations?: ProductVariation[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariation {
  id: string;
  name: string;
  price?: number; // Optional price override
  attributes: {
    [key: string]: string; // e.g., { "Color": "Red", "Size": "Large" }
  };
  sku?: string;
  inStock: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface ProductFilter {
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  sortBy?: 'price' | 'name' | 'newest' | 'popularity';
  sortDirection?: 'asc' | 'desc';
}

export interface ProductSearchParams extends ProductFilter {
  query?: string;
  page?: number;
  limit?: number;
}
