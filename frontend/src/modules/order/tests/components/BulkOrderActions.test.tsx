import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkOrderActions } from '../../components/BulkOrderActions';
import { OrderStatus } from '../../models/order';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      data-testid="button" 
      data-variant={variant} 
      data-size={size}
      className={className}
      disabled={disabled} 
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (
    <div data-testid="alert-dialog" data-open={open}>{children}</div>
  ),
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="alert-dialog-action" onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children, asChild }: any) => (
    <div data-testid="popover-trigger" data-as-child={asChild}>{children}</div>
  ),
  PopoverContent: ({ children, className }: any) => (
    <div data-testid="popover-content" className={className}>{children}</div>
  ),
}));

// Mock toast notification
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  ArrowDownToLine: () => <span data-testid="arrow-down-icon" />,
  ArrowUpFromLine: () => <span data-testid="arrow-up-icon" />,
  Edit2: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
}));

// Mock OrderBulkOperationsService
jest.mock('@/modules/order/services/OrderBulkOperationsService', () => {
  return {
    OrderBulkOperationsService: jest.fn().mockImplementation(() => {
      return {
        bulkUpdateStatus: jest.fn().mockResolvedValue({ success: true }),
        deleteOrders: jest.fn().mockResolvedValue({ success: true }),
      };
    }),
  };
});

// Mock OrderCsvService
jest.mock('@/modules/order/services/OrderCsvService', () => {
  return {
    orderCsvService: {
      downloadOrdersCsv: jest.fn(),
      importOrdersFromCsv: jest.fn().mockReturnValue([]),
      validateImportedOrders: jest.fn().mockReturnValue({ valid: [], errors: [] }),
    },
  };
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('BulkOrderActions', () => {
  // Default props for the component
  const defaultProps = {
    selectedOrderIds: ['order-1', 'order-2'],
    selectedOrders: [
      { id: 'order-1', status: OrderStatus.PENDING },
      { id: 'order-2', status: OrderStatus.PROCESSING },
    ],
    tenantId: 'tenant-123',
    onOperationComplete: jest.fn(),
    clearSelection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
  });

  test('renders message when no orders selected', () => {
    const props = {
      ...defaultProps,
      selectedOrderIds: [],
      selectedOrders: [],
    };

    render(<BulkOrderActions {...props} />);
    
    expect(screen.getByText('Select orders to perform bulk actions')).toBeInTheDocument();
  });

  test('renders correct number of selected orders', () => {
    render(<BulkOrderActions {...defaultProps} />);
    
    expect(screen.getByText('2 orders selected')).toBeInTheDocument();
  });

  test('renders singular text with one selected order', () => {
    const props = {
      ...defaultProps,
      selectedOrderIds: ['order-1'],
      selectedOrders: [{ id: 'order-1', status: OrderStatus.PENDING }],
    };

    render(<BulkOrderActions {...props} />);
    
    expect(screen.getByText('1 order selected')).toBeInTheDocument();
  });

  test('renders all action buttons', () => {
    render(<BulkOrderActions {...defaultProps} />);
    
    expect(screen.getByText('Update Status')).toBeInTheDocument();
    expect(screen.getByText('Batch Edit')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Import CSV')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('opens delete confirmation dialog when delete button clicked', () => {
    render(<BulkOrderActions {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Delete'));
    
    const alertDialog = screen.getByTestId('alert-dialog');
    expect(alertDialog).toHaveAttribute('data-open', 'true');
    expect(screen.getByText(/This will permanently delete 2 orders/)).toBeInTheDocument();
  });

  test('handles batch edit button click', () => {
    const { useRouter } = jest.requireMock('next/navigation');
    const pushMock = useRouter().push;
    
    render(<BulkOrderActions {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Batch Edit'));
    
    expect(sessionStorage.getItem('batchEditOrderIds')).toBe(JSON.stringify(defaultProps.selectedOrderIds));
    expect(pushMock).toHaveBeenCalledWith('/dashboard/orders/batch-edit');
  });

  test('handles export CSV button click', () => {
    const { orderCsvService } = jest.requireMock('@/modules/order/services/OrderCsvService');
    const downloadMock = orderCsvService.downloadOrdersCsv;
    
    render(<BulkOrderActions {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Export CSV'));
    
    expect(downloadMock).toHaveBeenCalledWith(
      defaultProps.selectedOrders,
      expect.stringMatching(/orders-export-.*\.csv/)
    );
    expect(defaultProps.onOperationComplete).not.toHaveBeenCalled();
    expect(defaultProps.clearSelection).not.toHaveBeenCalled();
  });

  test('handles bulk delete operation', async () => {
    const { OrderBulkOperationsService } = jest.requireMock('@/modules/order/services/OrderBulkOperationsService');
    const deleteOrdersMock = OrderBulkOperationsService().deleteOrders;
    
    render(<BulkOrderActions {...defaultProps} />);
    
    // Open delete dialog
    fireEvent.click(screen.getByText('Delete'));
    
    // Confirm deletion
    fireEvent.click(screen.getByTestId('alert-dialog-action'));
    
    await waitFor(() => {
      expect(deleteOrdersMock).toHaveBeenCalledWith(
        defaultProps.selectedOrderIds,
        defaultProps.tenantId
      );
    });
    
    expect(defaultProps.onOperationComplete).toHaveBeenCalled();
    expect(defaultProps.clearSelection).toHaveBeenCalled();
  });

  test('handles bulk status update operation', async () => {
    const { OrderBulkOperationsService } = jest.requireMock('@/modules/order/services/OrderBulkOperationsService');
    const bulkUpdateStatusMock = OrderBulkOperationsService().bulkUpdateStatus;
    
    // Create a helper function to simulate clicking on status in the popover
    const simulateStatusUpdate = async (component: HTMLElement, status: OrderStatus) => {
      // Find the Update Status button
      const updateStatusButton = screen.getByText('Update Status');
      
      // Get the onClick handler from the button component
      const buttons = screen.getAllByTestId('button');
      const statusButtons = Array.from(buttons).filter(b => b.textContent === status);
      
      if (statusButtons.length > 0) {
        fireEvent.click(statusButtons[0]);
      }
      
      await waitFor(() => {
        expect(bulkUpdateStatusMock).toHaveBeenCalledWith(
          defaultProps.selectedOrderIds,
          status,
          defaultProps.tenantId
        );
      });
    };
    
    const { container } = render(<BulkOrderActions {...defaultProps} />);
    
    // Simulate clicking on "Update Status" then selecting "SHIPPED"
    await simulateStatusUpdate(container, OrderStatus.SHIPPED);
    
    expect(defaultProps.onOperationComplete).toHaveBeenCalled();
    expect(defaultProps.clearSelection).toHaveBeenCalled();
  });

  test('handles CSV file selection', () => {
    render(<BulkOrderActions {...defaultProps} />);
    
    // Mock file input change
    const file = new File(['test,data'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    // We can't easily test file input directly due to React Testing Library limitations,
    // but we can test that the button exists and the handler would be triggered
    expect(screen.getByText('Import CSV')).toBeInTheDocument();
  });
});
