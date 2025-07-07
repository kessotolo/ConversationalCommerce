export interface DashboardStatsResponse {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts?: number;
  totalCustomers?: number;
  revenueGrowth?: number;
  ordersGrowth?: number;
  productsGrowth?: number;
  customersGrowth?: number;
  // Add more fields as needed
}
