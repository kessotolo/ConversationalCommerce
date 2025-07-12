import { render, screen, fireEvent } from '@testing-library/react';
import { OrdersTable } from '../../components/OrdersTable';
import { OrderStatus } from '../../models/order';

// Mock child components
jest.mock('../../components/OrderStatusBadge', () => ({
  OrderStatusBadge: ({ status }: { status: OrderStatus }) => (
    <div data-testid="order-status-badge">{status}</div>
  ),
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon">Check</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  MessageSquare: () => <div data-testid="message-icon">Message</div>,
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...rest }: any) => (
    <button 
      onClick={onClick} 
      className={className || ''} 
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  ),
}));

// Mock utility functions
jest.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number | string, currency: string) => `${amount} ${currency}`,
  formatDate: (date: Date) => '2023-07-12',
  formatPhoneNumber: (phone: string) => `Formatted: ${phone}`,
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

describe('OrdersTable', () => {
  // Import additional enums for mock data
  const { OrderSource, PaymentMethod, PaymentStatus } = jest.requireActual('../../models/order');
  
  const mockOrder1 = {
    id: '1',
    order_number: 'ORD-001',
    status: OrderStatus.PENDING,
    total_amount: { amount: 100, currency: 'USD' },
    subtotal: { amount: 90, currency: 'USD' },
    tax: { amount: 10, currency: 'USD' },
    created_at: '2023-07-10T12:00:00Z',
    source: OrderSource.WEBSITE,
    customer: {
      id: 'cust1',
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com',
      is_guest: false
    },
    items: [
      {
        id: 'item1',
        product_id: 'prod1',
        product_name: 'Product 1',
        quantity: 2,
        unit_price: { amount: 45, currency: 'USD' },
        total_price: { amount: 90, currency: 'USD' },
      },
    ],
    shipping: {
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA'
      },
      method: 'Standard Shipping',
      shipping_cost: { amount: 10, currency: 'USD' }
    },
    payment: {
      method: PaymentMethod.CARD,
      status: PaymentStatus.COMPLETED,
      amount_paid: { amount: 100, currency: 'USD' },
      transaction_id: 'tx123'
    },
    timeline: [
      {
        id: 'timeline1',
        status: OrderStatus.PENDING,
        timestamp: '2023-07-10T12:00:00Z',
      }
    ],
    idempotency_key: 'idem-123',
    tenant_id: 'tenant1',
  };

  const mockOrder2 = {
    id: '2',
    order_number: 'ORD-002',
    status: OrderStatus.DELIVERED,
    total_amount: { amount: 200, currency: 'USD' },
    subtotal: { amount: 185, currency: 'USD' },
    tax: { amount: 15, currency: 'USD' },
    created_at: '2023-07-11T12:00:00Z',
    source: OrderSource.WHATSAPP,
    customer: {
      id: 'cust2',
      name: 'Jane Smith',
      phone: '+0987654321',
      email: 'jane@example.com',
      is_guest: false
    },
    items: [
      {
        id: 'item2',
        product_id: 'prod2',
        product_name: 'Product 2',
        quantity: 1,
        unit_price: { amount: 185, currency: 'USD' },
        total_price: { amount: 185, currency: 'USD' },
      },
    ],
    shipping: {
      address: {
        street: '456 Oak St',
        city: 'Othertown',
        state: 'NY',
        postalCode: '67890',
        country: 'USA'
      },
      method: 'Express Shipping',
      shipping_cost: { amount: 15, currency: 'USD' }
    },
    payment: {
      method: PaymentMethod.CARD,
      status: PaymentStatus.COMPLETED,
      amount_paid: { amount: 200, currency: 'USD' },
      transaction_id: 'tx456'
    },
    timeline: [
      {
        id: 'timeline2',
        status: OrderStatus.PROCESSING,
        timestamp: '2023-07-11T12:30:00Z',
      },
      {
        id: 'timeline3',
        status: OrderStatus.SHIPPED,
        timestamp: '2023-07-12T09:00:00Z',
      },
      {
        id: 'timeline4',
        status: OrderStatus.DELIVERED,
        timestamp: '2023-07-13T14:00:00Z',
      }
    ],
    idempotency_key: 'idem-456',
    tenant_id: 'tenant1',
  };

  const defaultProps = {
    orders: [mockOrder1, mockOrder2],
    selectedOrders: [],
    toggleSelectOrder: jest.fn(),
    toggleSelectAll: jest.fn(),
    messageCustomer: jest.fn(),
    updateOrderStatus: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders table headers correctly', () => {
    render(<OrdersTable {...defaultProps} />);
    
    // Check for all column headers
    expect(screen.getByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  test('renders orders correctly', () => {
    render(<OrdersTable {...defaultProps} />);
    
    // Check for order details
    expect(screen.getByText('#ORD-001')).toBeInTheDocument();
    expect(screen.getByText('#ORD-002')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Formatted: +1234567890')).toBeInTheDocument();
    expect(screen.getByText('Formatted: +0987654321')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
  });

  test('renders correct number of order status badges', () => {
    render(<OrdersTable {...defaultProps} />);
    
    const statusBadges = screen.getAllByTestId('order-status-badge');
    expect(statusBadges).toHaveLength(2);
    expect(statusBadges[0]).toHaveTextContent(OrderStatus.PENDING);
    expect(statusBadges[1]).toHaveTextContent(OrderStatus.DELIVERED);
  });

  test('renders action buttons for each order', () => {
    render(<OrdersTable {...defaultProps} />);
    
    const eyeIcons = screen.getAllByTestId('eye-icon');
    const checkIcons = screen.getAllByTestId('check-icon');
    const messageIcons = screen.getAllByTestId('message-icon');
    
    expect(eyeIcons).toHaveLength(2);
    expect(checkIcons).toHaveLength(2);
    expect(messageIcons).toHaveLength(2);
  });

  test('displays "No orders found" when orders array is empty', () => {
    render(<OrdersTable {...defaultProps} orders={[]} />);
    
    expect(screen.getByText('No orders found.')).toBeInTheDocument();
  });

  test('correctly handles selection of individual orders', () => {
    render(<OrdersTable {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    // Skip header checkbox (index 0)
    const checkbox = checkboxes[1] as HTMLInputElement;
    fireEvent.click(checkbox);
    
    expect(defaultProps.toggleSelectOrder).toHaveBeenCalledWith('1');
  });

  test('correctly handles select all checkbox', () => {
    render(<OrdersTable {...defaultProps} />);
    
    const headerCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
    fireEvent.click(headerCheckbox);
    
    expect(defaultProps.toggleSelectAll).toHaveBeenCalled();
  });

  test('displays checked state for selected orders', () => {
    const props = {
      ...defaultProps,
      selectedOrders: ['1'],
    };
    
    render(<OrdersTable {...props} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    // Header checkbox (not selected because not all are selected)
    expect(checkboxes[0]).not.toBeChecked();
    // First order checkbox (should be selected)
    expect(checkboxes[1]).toBeChecked();
    // Second order checkbox (should not be selected)
    expect(checkboxes[2]).not.toBeChecked();
  });

  test('message customer button calls messageCustomer with correct phone', () => {
    render(<OrdersTable {...defaultProps} />);
    
    const messageButtons = screen.getAllByTitle('Message Customer');
    const messageButton = messageButtons[0] as HTMLButtonElement;
    fireEvent.click(messageButton);
    
    expect(defaultProps.messageCustomer).toHaveBeenCalledWith('+1234567890');
  });

  test('update status button calls updateOrderStatus with correct params', () => {
    render(<OrdersTable {...defaultProps} />);
    
    const updateButtons = screen.getAllByTitle('Update Status');
    expect(updateButtons.length).toBeGreaterThan(0);
    const updateButton = updateButtons[0] as HTMLButtonElement;
    fireEvent.click(updateButton);
    
    expect(defaultProps.updateOrderStatus).toHaveBeenCalledWith('1', OrderStatus.PROCESSING);
  });

  test('view order links have correct hrefs', () => {
    render(<OrdersTable {...defaultProps} />);
    
    const links = screen.getAllByTestId('next-link');
    
    expect(links[0]).toHaveAttribute('href', '/dashboard/orders/1');
    expect(links[1]).toHaveAttribute('href', '/dashboard/orders/2');
  });

  test('handles all selected state correctly', () => {
    const props = {
      ...defaultProps,
      selectedOrders: ['1', '2'],
    };
    
    render(<OrdersTable {...props} />);
    
    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    expect(headerCheckbox).toBeChecked();
  });

  test('applies correct highlight to selected rows', () => {
    const props = {
      ...defaultProps,
      selectedOrders: ['1'],
    };
    
    const { container } = render(<OrdersTable {...props} />);
    
    // Find rows (tr elements) - first is header row, second and third are data rows
    const rows = container.querySelectorAll('tr');
    
    // Make sure we have at least 3 rows (header + 2 data rows)
    expect(rows.length).toBeGreaterThanOrEqual(3);
    
    // Check that row has the bg-blue-50 class (highlighted)
    expect(rows[1]?.className || '').toContain('bg-blue-50');
    // Check that second row doesn't have highlighting
    expect(rows[2]?.className || '').not.toContain('bg-blue-50');
  });

  test('handles different total_amount format correctly', () => {
    const ordersWithDifferentTotal = [
      {
        ...mockOrder1,
        total_amount: { amount: 150, currency: 'USD' },
      },
    ] as any;
    
    render(<OrdersTable {...defaultProps} orders={ordersWithDifferentTotal} />);
    
    // With the mocked formatCurrency, we should get "150 USD"
    expect(screen.getByText('150 USD')).toBeInTheDocument();
  });
});
