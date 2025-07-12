import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderTracking } from '../../components/OrderTracking';
import { OrderStatus } from '../../models/order';
import type { Order } from '../../models/order';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode, className?: string }) => <div data-testid="card-content" className={className}>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode, className?: string }) => <div data-testid="card-title" className={className}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode, variant?: string }) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: { 
    children: React.ReactNode, 
    onClick?: () => void, 
    variant?: string, 
    size?: string
  }) => (
    <button 
      data-testid="button" 
      data-variant={variant} 
      data-size={size} 
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number, className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => <hr data-testid="separator" className={className} />,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  Package: () => <div data-testid="package-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Truck: () => <div data-testid="truck-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

describe('OrderTracking', () => {
  // Create a mock OrderService with typed methods
  const createMockOrderService = () => ({
    getOrderById: jest.fn(),
    getOrders: jest.fn(),
    getOrdersByPhone: jest.fn(),
    getOrdersByCustomerId: jest.fn(),
  });

  // Create a mock Order
  const createMockOrder = (status: OrderStatus = OrderStatus.PROCESSING): Order => ({
    id: 'order-123',
    tenant_id: 'tenant-123',
    order_number: 'ORD-12345',
    customer: {
      id: 'cust-123',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1234567890',
    },
    status,
    items: [
      {
        id: 'item-1',
        product_id: 'prod-1',
        product_name: 'Test Product',
        quantity: 2,
        unit_price: { amount: 25.00, currency: 'USD' },
        total_price: { amount: 50.00, currency: 'USD' },
        options: [],
      }
    ],
    subtotal: { amount: 50.00, currency: 'USD' },
    tax: { amount: 5.00, currency: 'USD' },
    total_amount: { amount: 55.00, currency: 'USD' },
    created_at: '2023-07-15T14:30:00Z',
    updated_at: '2023-07-15T14:30:00Z',
    shipping: {
      method: 'EXPRESS',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postal_code: '12345',
        country: 'USA',
      },
      tracking_number: 'TRK123456',
      estimated_delivery: '2023-07-20',
    },
    payment: {
      method: 'CREDIT_CARD',
      status: 'COMPLETED',
      transaction_id: 'txn-123456',
      details: {
        last4: '4242',
        expiry: '05/25',
        card_type: 'VISA',
      },
    },
    notes: 'Please leave at the door',
    source: 'WEBSITE',
    timeline: [
      {
        status: OrderStatus.PROCESSING,
        timestamp: '2023-07-15T14:30:00Z',
        description: 'Order is being processed',
      },
      {
        status: OrderStatus.PENDING,
        timestamp: '2023-07-15T14:00:00Z',
        description: 'Order received',
      }
    ]
  });

  test('renders loading state', () => {
    const mockOrderService = createMockOrderService();
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any} 
        orderId="123"
        tenantId="tenant-123" 
      />
    );
    
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByText('Loading order details...')).toBeInTheDocument();
  });
  
  test('handles error state', async () => {
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrderById.mockResolvedValue({
      success: false,
      error: new Error('Failed to load order'),
    });
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any} 
        orderId="123"
        tenantId="tenant-123" 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load order')).toBeInTheDocument();
    });
    expect(screen.getByTestId('button')).toBeInTheDocument();
  });
  
  test('handles order not found state', async () => {
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrderById.mockResolvedValue({
      success: true,
      data: undefined,
    });
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any} 
        orderId="123"
        tenantId="tenant-123" 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('No order found')).toBeInTheDocument();
    });
    expect(screen.getByText('Please check your order details and try again.')).toBeInTheDocument();
  });
  
  test('renders order details correctly', async () => {
    const mockOrder = createMockOrder();
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrderById.mockResolvedValue({
      success: true,
      data: mockOrder,
    });
    
    const onOrderLoaded = jest.fn();
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any} 
        orderId="123"
        tenantId="tenant-123"
        onOrderLoaded={onOrderLoaded}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Order #ORD-12345')).toBeInTheDocument();
    });
    
    // Check order information sections
    expect(screen.getByText('Order Information')).toBeInTheDocument();
    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    expect(screen.getByText('Order Items')).toBeInTheDocument();
    expect(screen.getByText('Order Timeline')).toBeInTheDocument();
    
    // Check order details
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Anytown, CA, 12345, USA')).toBeInTheDocument();
    expect(screen.getByText('Tracking Number: TRK123456')).toBeInTheDocument();
    
    // Check callback
    expect(onOrderLoaded).toHaveBeenCalledWith(mockOrder);
  });
  
  test('fetches order by order number when no order ID is provided', async () => {
    const mockOrder = createMockOrder();
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrders.mockResolvedValue({
      success: true,
      data: {
        items: [mockOrder],
        total: 1,
        page: 1,
        limit: 10,
      },
    });
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any} 
        orderNumber="ORD-12345"
        tenantId="tenant-123" 
      />
    );
    
    await waitFor(() => {
      expect(mockOrderService.getOrders).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        search: 'ORD-12345',
        limit: 1,
      });
    });
    
    expect(screen.getByText('Order #ORD-12345')).toBeInTheDocument();
  });
  
  test('fetches order by customer phone when no order ID or number is provided', async () => {
    const mockOrder = createMockOrder();
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrdersByPhone.mockResolvedValue({
      success: true,
      data: [mockOrder],
    });
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any}
        customerPhone="+1234567890"
        tenantId="tenant-123" 
      />
    );
    
    await waitFor(() => {
      expect(mockOrderService.getOrdersByPhone).toHaveBeenCalledWith("+1234567890", "tenant-123");
    });
    
    expect(screen.getByText('Order #ORD-12345')).toBeInTheDocument();
  });
  
  test('fetches order by customer ID when no other identifiers are provided', async () => {
    const mockOrder = createMockOrder();
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrdersByCustomerId.mockResolvedValue({
      success: true,
      data: [mockOrder],
    });
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any}
        customerId="cust-123"
        tenantId="tenant-123" 
      />
    );
    
    await waitFor(() => {
      expect(mockOrderService.getOrdersByCustomerId).toHaveBeenCalledWith("cust-123", "tenant-123");
    });
    
    expect(screen.getByText('Order #ORD-12345')).toBeInTheDocument();
  });
  
  test('refresh button triggers reload of order data', async () => {
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrderById.mockResolvedValue({
      success: false,
      error: new Error('Failed to load order'),
    });
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any} 
        orderId="123"
        tenantId="tenant-123" 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load order')).toBeInTheDocument();
    });
    
    // First call happened during initial load
    expect(mockOrderService.getOrderById).toHaveBeenCalledTimes(1);
    
    // Click the refresh button
    fireEvent.click(screen.getByText('Try Again'));
    
    // Should call getOrderById again
    expect(mockOrderService.getOrderById).toHaveBeenCalledTimes(2);
  });
  
  test('renders correct status badge based on order status', async () => {
    const mockOrder = createMockOrder(OrderStatus.DELIVERED);
    const mockOrderService = createMockOrderService();
    mockOrderService.getOrderById.mockResolvedValue({
      success: true,
      data: mockOrder,
    });
    
    render(
      <OrderTracking 
        orderService={mockOrderService as any} 
        orderId="123"
        tenantId="tenant-123" 
      />
    );
    
    await waitFor(() => {
      const badge = screen.getByText(OrderStatus.DELIVERED);
      expect(badge).toBeInTheDocument();
      expect(badge.closest('[data-variant]')).toHaveAttribute('data-variant', 'default');
    });
  });
});
