// Product type definitions
// Using UUID type for ID fields as per project standardization
export interface Product {
  id: string; // UUID
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
  id: string; // UUID
  name: string;
  price?: number; // Optional price override
  attributes: {
    [key: string]: string; // e.g., { "Color": "Red", "Size": "Large" }
  };
  sku?: string;
  inStock: boolean;
}

export interface ProductCategory {
  id: string; // UUID
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
