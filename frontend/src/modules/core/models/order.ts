export interface Order {
  id: string;
  user_id: string;
  product_ids: string[];
  amount: number;
  status: string;
  created_at: string;
  updated_at?: string;
  // Add more fields as needed
}

export interface CreateOrderRequest {
  user_id: string;
  product_ids: string[];
  amount: number;
}

export interface OrderResponse {
  order: Order;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
}
