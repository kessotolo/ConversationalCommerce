// Product DTOs
export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export interface UpdateProductRequest {
  name?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
}

export interface ProductResponse {
  product: Product;
}

export interface ProductsResponse {
  products: Product[];
}

// Order DTOs
export interface Order {
  id: string;
  customerName: string;
  phone: string;
  amount: number;
  items: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  paymentMethod: string;
}

export interface CreateOrderRequest {
  customerName: string;
  phone: string;
  amount: number;
  items: number;
  paymentMethod: string;
}

export interface OrderResponse {
  order: Order;
}

export interface OrdersResponse {
  orders: Order[];
}

// Dashboard DTOs
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  customers: number;
  conversionRate: number;
}

export interface DashboardStatsResponse {
  stats: DashboardStats;
}

// Generic API Response
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}
