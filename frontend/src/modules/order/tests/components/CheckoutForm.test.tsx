import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutForm } from '../../components/CheckoutForm';
import { OrderSource, PaymentMethod, ShippingMethod } from '../../models/order';
import * as addressApi from '@/lib/api/addressBook';
import { useCreateOrder } from '@/modules/order/hooks/useCreateOrder';

// Mock the useCreateOrder hook
jest.mock('@/modules/order/hooks/useCreateOrder', () => ({
  useCreateOrder: jest.fn(),
}));

// Mock the address API
jest.mock('@/lib/api/addressBook', () => ({
  getAddresses: jest.fn(),
}));

// Mock fetch API
global.fetch = jest.fn().mockResolvedValue({
  json: jest.fn().mockResolvedValue({ providers: [] }),
});

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid-123');
Object.defineProperty(global.crypto, 'randomUUID', { value: mockRandomUUID });

describe('CheckoutForm', () => {
  const defaultProps = {
    cartItems: [
      {
        id: 'product-1',
        name: 'Test Product',
        quantity: 2,
        price: 25,
        variantId: 'variant-1',
        variantName: 'Medium',
        imageUrl: '/images/test-product.jpg',
      },
    ],
    shippingCost: { amount: 5, currency: 'USD' },
    taxAmount: { amount: 2.5, currency: 'USD' },
    totalAmount: { amount: 57.5, currency: 'USD' },
    onCheckoutSuccess: jest.fn(),
  };

  const mockAddresses = [
    {
      id: 'address-1',
      street: '123 Main St',
      city: 'Nairobi',
      state: 'Nairobi County',
      postal_code: '00100',
      country: 'Kenya',
      is_default: true,
    },
    {
      id: 'address-2',
      street: '456 Side St',
      city: 'Mombasa',
      state: 'Mombasa County',
      postal_code: '80100',
      country: 'Kenya',
      is_default: false,
    },
  ];

  const mockCreateOrderImplementation = () => {
    const mockCreateOrder = jest.fn().mockResolvedValue({
      id: 'order-123',
      order_number: 'ORD-12345',
    });
    
    return {
      createOrder: mockCreateOrder,
      order: null,
      isLoading: false,
      error: null,
      isSuccess: false,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (addressApi.getAddresses as jest.Mock).mockResolvedValue(mockAddresses);
    (useCreateOrder as jest.Mock).mockReturnValue(mockCreateOrderImplementation());
  });

  test('renders checkout form with all required fields', async () => {
    render(<CheckoutForm {...defaultProps} />);
    
    // Check for main sections
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    expect(screen.getByText('Payment Method')).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    
    // Check for required input fields
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Street Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole('button', { name: /Place Order/i })).toBeInTheDocument();
    
    // Check for cart items
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  test('loads saved addresses on mount', async () => {
    render(<CheckoutForm {...defaultProps} />);
    
    await waitFor(() => {
      expect(addressApi.getAddresses).toHaveBeenCalledTimes(1);
    });
    
    // Check if saved addresses dropdown appears
    const savedAddressesSelect = await screen.findByLabelText(/Saved Addresses/i);
    expect(savedAddressesSelect).toBeInTheDocument();
    
    // Default address should be pre-selected
    expect(savedAddressesSelect).toHaveValue('address-1');
    
    // Form fields should be populated with default address
    expect(screen.getByLabelText(/Street Address/i)).toHaveValue('123 Main St');
    expect(screen.getByLabelText(/City/i)).toHaveValue('Nairobi');
  });

  test('changes form values when selecting different saved address', async () => {
    render(<CheckoutForm {...defaultProps} />);
    
    // Wait for addresses to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Saved Addresses/i)).toBeInTheDocument();
    });
    
    // Select the second address
    fireEvent.change(screen.getByLabelText(/Saved Addresses/i), { target: { value: 'address-2' } });
    
    // Form fields should be updated with the selected address
    expect(screen.getByLabelText(/Street Address/i)).toHaveValue('456 Side St');
    expect(screen.getByLabelText(/City/i)).toHaveValue('Mombasa');
  });

  test('shows validation errors when submitting empty required fields', async () => {
    render(<CheckoutForm {...defaultProps} />);
    
    // Clear all input fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: '' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));
    
    // Validation errors should appear
    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Valid phone number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Street address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/City is required/i)).toBeInTheDocument();
    });
    
    // Create order should not have been called
    const { createOrder } = useCreateOrder();
    expect(createOrder).not.toHaveBeenCalled();
  });

  test('submits order with correct data when form is valid', async () => {
    const { createOrder } = useCreateOrder();
    
    render(<CheckoutForm {...defaultProps} />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '+254712345678' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    
    // Address fields should already be filled with default address
    
    // Add order notes
    fireEvent.change(screen.getByLabelText(/Order Notes/i), {
      target: { value: 'Please deliver in the afternoon' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));
    
    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+254712345678',
            is_guest: true,
          },
          items: [
            expect.objectContaining({
              product_id: 'product-1',
              quantity: 2,
              unit_price: { amount: 25, currency: 'USD' },
            }),
          ],
          shipping: expect.objectContaining({
            address: expect.objectContaining({
              street: '123 Main St',
              city: 'Nairobi',
              state: 'Nairobi County',
            }),
            method: ShippingMethod.RIDER,
          }),
          payment: expect.objectContaining({
            method: PaymentMethod.MOBILE_MONEY,
          }),
          source: OrderSource.WEBSITE,
          notes: 'Please deliver in the afternoon',
          idempotency_key: 'test-uuid-123',
        })
      );
    });
  });

  test('handles successful order creation', async () => {
    // Mock successful order creation
    (useCreateOrder as jest.Mock).mockReturnValue({
      createOrder: jest.fn().mockResolvedValue({
        id: 'order-123',
        order_number: 'ORD-12345',
      }),
      order: { id: 'order-123', order_number: 'ORD-12345' },
      isLoading: false,
      error: null,
      isSuccess: true,
    });
    
    render(<CheckoutForm {...defaultProps} />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '+254712345678' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Order #ORD-12345 created successfully!')).toBeInTheDocument();
    });
    
    // Check if onCheckoutSuccess callback was called
    expect(defaultProps.onCheckoutSuccess).toHaveBeenCalledWith('order-123', 'ORD-12345');
  });

  test('handles error during order creation', async () => {
    // Mock error during order creation
    const errorMessage = 'Payment processing failed';
    (useCreateOrder as jest.Mock).mockReturnValue({
      createOrder: jest.fn().mockRejectedValue(new Error(errorMessage)),
      order: null,
      isLoading: false,
      error: { message: errorMessage },
      isSuccess: false,
    });
    
    render(<CheckoutForm {...defaultProps} />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '+254712345678' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    // Callback should not have been called
    expect(defaultProps.onCheckoutSuccess).not.toHaveBeenCalled();
  });

  test('changes payment method options when selecting different methods', async () => {
    render(<CheckoutForm {...defaultProps} />);
    
    // Check default payment method (Mobile Money)
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
    
    // Change to Credit Card
    fireEvent.click(screen.getByLabelText(/Credit Card/i));
    
    // Should see credit card fields
    expect(screen.getByLabelText(/Card Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CVC/i)).toBeInTheDocument();
    
    // Change to Cash on Delivery
    fireEvent.click(screen.getByLabelText(/Cash on Delivery/i));
    
    // Credit card fields should be gone
    expect(screen.queryByLabelText(/Card Number/i)).not.toBeInTheDocument();
  });

  test('changes shipping method options', async () => {
    render(<CheckoutForm {...defaultProps} />);
    
    // Default shipping method (Rider)
    expect(screen.getByLabelText(/Motorcycle Delivery/i)).toBeChecked();
    
    // Change to Pickup
    fireEvent.click(screen.getByLabelText(/Store Pickup/i));
    
    // Pickup should now be checked
    expect(screen.getByLabelText(/Store Pickup/i)).toBeChecked();
  });
});
