import { render, screen } from '@testing-library/react';
import { OrderStatusBadge, getStatusDisplay } from '../../components/OrderStatusBadge';
import { OrderStatus } from '../../models/order';

// Mock the Badge component to isolate our component tests
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="badge" className={className}>
      {children}
    </div>
  ),
}));

describe('OrderStatusBadge', () => {
  describe('getStatusDisplay', () => {
    test('formats PENDING status correctly', () => {
      const result = getStatusDisplay(OrderStatus.PENDING);
      expect(result).toBe('Pending');
    });

    test('formats DELIVERED status correctly', () => {
      const result = getStatusDisplay(OrderStatus.DELIVERED);
      expect(result).toBe('Delivered');
    });

    test('formats CANCELLED status correctly', () => {
      const result = getStatusDisplay(OrderStatus.CANCELLED);
      expect(result).toBe('Cancelled');
    });

    test('handles all possible order statuses', () => {
      // Test all order status values to ensure complete coverage
      const allStatuses = Object.values(OrderStatus);
      
      allStatuses.forEach(status => {
        const result = getStatusDisplay(status as OrderStatus);
        // First letter should be uppercase, rest lowercase
        expect(result.charAt(0)).toBe(status.charAt(0).toUpperCase());
        expect(result.slice(1)).toBe(status.slice(1).toLowerCase());
      });
    });
  });

  describe('OrderStatusBadge component', () => {
    test('renders with correct status text for PENDING', () => {
      render(<OrderStatusBadge status={OrderStatus.PENDING} />);
      expect(screen.getByTestId('badge')).toHaveTextContent('Pending');
    });

    test('renders with correct status text for SHIPPED', () => {
      render(<OrderStatusBadge status={OrderStatus.SHIPPED} />);
      expect(screen.getByTestId('badge')).toHaveTextContent('Shipped');
    });

    test('applies the correct class for PENDING status', () => {
      render(<OrderStatusBadge status={OrderStatus.PENDING} />);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-800');
    });

    test('applies the correct class for DELIVERED status', () => {
      render(<OrderStatusBadge status={OrderStatus.DELIVERED} />);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });

    test('applies the correct class for CANCELLED status', () => {
      render(<OrderStatusBadge status={OrderStatus.CANCELLED} />);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-800');
    });

    test('applies additional classes when provided', () => {
      const additionalClass = 'test-custom-class';
      render(<OrderStatusBadge status={OrderStatus.PENDING} className={additionalClass} />);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain(additionalClass);
    });

    test('renders for all possible order statuses', () => {
      // Test all order status values to ensure component handles all cases
      const allStatuses = Object.values(OrderStatus);
      
      allStatuses.forEach(status => {
        const { unmount } = render(<OrderStatusBadge status={status as OrderStatus} />);
        expect(screen.getByTestId('badge')).toBeTruthy();
        unmount();
      });
    });
  });
});
