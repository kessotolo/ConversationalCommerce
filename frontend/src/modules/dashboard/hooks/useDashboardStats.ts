import { useState, useEffect } from 'react';

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch dashboard statistics data
 */
export const useDashboardStats = (): DashboardStats => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/dashboard/stats');
        
        if (!response.ok) {
          throw new Error(`Error fetching dashboard stats: ${response.statusText}`);
        }
        
        const data = await response.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          totalOrders: data.totalOrders || 0,
          totalRevenue: data.totalRevenue || 0,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching dashboard stats'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return {
    ...stats,
    isLoading,
    error,
  };
};

export default useDashboardStats;
