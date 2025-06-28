export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
  updated_at?: string;
  // Add more fields as needed
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  image?: File | string;
  video?: File | string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  image?: File | string | null;
  video?: File | string | null;
}

export interface ProductResponse {
  product: Product;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
}
