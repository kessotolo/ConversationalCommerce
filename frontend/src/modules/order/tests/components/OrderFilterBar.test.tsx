import { render, screen, fireEvent } from '@testing-library/react';
import { OrderFilterBar } from '../../components/OrderFilterBar';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search Icon</div>,
}));

describe('OrderFilterBar', () => {
  // Default props for most tests
  const defaultProps = {
    statusFilter: 'all',
    setStatusFilter: jest.fn(),
    searchTerm: '',
    setSearchTerm: jest.fn(),
    ordersCount: {
      all: 100,
      pending: 20,
      processing: 30,
      shipped: 15,
      delivered: 25,
      cancelled: 10,
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders all status filter tabs with correct counts', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    // Check that all tabs are rendered with correct text and counts
    expect(screen.getByText('All Orders')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  test('renders search input with correct placeholder', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(
      'Search orders by customer name, order number, or phone number...'
    );
    expect(searchInput).toBeInTheDocument();
  });

  test('search icon is rendered', () => {
    render(<OrderFilterBar {...defaultProps} />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  test('clicking "All Orders" tab calls setStatusFilter with "all"', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('All Orders'));
    expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('all');
  });

  test('clicking "Pending" tab calls setStatusFilter with "pending"', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Pending'));
    expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('pending');
  });

  test('clicking "Processing" tab calls setStatusFilter with "processing"', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Processing'));
    expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('processing');
  });

  test('clicking "Shipped" tab calls setStatusFilter with "shipped"', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Shipped'));
    expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('shipped');
  });

  test('clicking "Delivered" tab calls setStatusFilter with "delivered"', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Delivered'));
    expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('delivered');
  });

  test('clicking "Cancelled" tab calls setStatusFilter with "cancelled"', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Cancelled'));
    expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('cancelled');
  });

  test('typing in search input calls setSearchTerm with input value', () => {
    render(<OrderFilterBar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(
      'Search orders by customer name, order number, or phone number...'
    );
    
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    expect(defaultProps.setSearchTerm).toHaveBeenCalledWith('test search');
  });

  test('active tab has the correct styling', () => {
    const props = {
      ...defaultProps,
      statusFilter: 'pending',
    };
    
    render(<OrderFilterBar {...props} />);
    
    // Find all the tab buttons
    const allOrdersTab = screen.getByText('All Orders').closest('button');
    const pendingTab = screen.getByText('Pending').closest('button');
    
    // The pending tab should have primary color class
    expect(pendingTab).toHaveClass('border-primary');
    expect(pendingTab).toHaveClass('text-primary');
    
    // The all orders tab should not have primary color class
    expect(allOrdersTab).not.toHaveClass('border-primary');
    expect(allOrdersTab).not.toHaveClass('text-primary');
  });

  test('search input displays the current search term', () => {
    const props = {
      ...defaultProps,
      searchTerm: 'existing search',
    };
    
    render(<OrderFilterBar {...props} />);
    
    const searchInput = screen.getByPlaceholderText(
      'Search orders by customer name, order number, or phone number...'
    );
    
    expect(searchInput).toHaveValue('existing search');
  });
});
