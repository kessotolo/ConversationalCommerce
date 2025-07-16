import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCatalog } from '../ProductCatalog';
import type { Product } from '@/modules/product/models/product';
import { ProductStatus, ProductType } from '@/modules/product/models/product';

// Mock Next.js components
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Search: () => <div data-testid="search-icon" />,
    SortAsc: () => <div data-testid="sort-icon" />,
    Grid: () => <div data-testid="grid-icon" />,
    List: () => <div data-testid="list-icon" />,
    Heart: ({ className }: any) => <div data-testid="heart-icon" className={className} />,
    ShoppingBag: () => <div data-testid="shopping-bag-icon" />
}));

const mockProducts: Product[] = [
    {
        id: 'prod-1',
        name: 'Test Product 1',
        description: 'A great test product for electronics',
        slug: 'test-product-1',
        categories: ['electronics'],
        price: {
            amount: 2500,
            currency: 'USD'
        },
        images: [
            { id: 'img-1', url: 'https://example.com/image1.jpg', alt_text: 'Product 1' }
        ],
        sku: 'TEST-001',
        inventory_quantity: 10,
        track_inventory: true,
        variants: [],
        status: ProductStatus.ACTIVE,
        type: ProductType.PHYSICAL,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tenant_id: 'tenant-1'
    },
    {
        id: 'prod-2',
        name: 'Test Product 2',
        description: 'A fashionable test product',
        slug: 'test-product-2',
        categories: ['fashion'],
        price: {
            amount: 7500,
            currency: 'USD'
        },
        images: [
            { id: 'img-2', url: 'https://example.com/image2.jpg', alt_text: 'Product 2' }
        ],
        sku: 'TEST-002',
        inventory_quantity: 5,
        track_inventory: true,
        variants: [],
        status: ProductStatus.ACTIVE,
        type: ProductType.PHYSICAL,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        tenant_id: 'tenant-1'
    }
];

const defaultProps = {
    products: mockProducts,
    isLoading: false,
    onAddToCart: jest.fn(),
    onToggleWishlist: jest.fn(),
    wishlistItems: [] as string[],
    merchantId: 'merchant-1',
    className: ''
};

describe('ProductCatalog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state correctly', () => {
        render(<ProductCatalog {...defaultProps} isLoading={true} />);

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Loading products...')).toBeInTheDocument();

        // Should show skeleton items
        const skeletons = screen.getAllByTestId('product-skeleton');
        expect(skeletons).toHaveLength(8);
    });

    it('renders products in grid view by default', () => {
        render(<ProductCatalog {...defaultProps} />);

        expect(screen.getByRole('main', { name: 'Product catalog' })).toBeInTheDocument();
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.getByText('Test Product 2')).toBeInTheDocument();

        // Check that grid view is active
        const gridButton = screen.getByLabelText('Grid view');
        expect(gridButton).toHaveAttribute('data-active', 'true');
    });

    it('switches between grid and list view', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const listButton = screen.getByLabelText('List view');
        await user.click(listButton);

        expect(listButton).toHaveAttribute('data-active', 'true');

        // Switch back to grid
        const gridButton = screen.getByLabelText('Grid view');
        await user.click(gridButton);

        expect(gridButton).toHaveAttribute('data-active', 'true');
    });

    it('filters products by search term', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const searchInput = screen.getByLabelText('Search products');
        await user.type(searchInput, 'electronics');

        await waitFor(() => {
            expect(screen.getByText('Test Product 1')).toBeInTheDocument();
            expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
        });
    });

    it('filters products by category', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const categorySelect = screen.getByLabelText('Filter by category');
        await user.click(categorySelect);

        const fashionOption = screen.getByText('fashion');
        await user.click(fashionOption);

        await waitFor(() => {
            expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument();
            expect(screen.getByText('Test Product 2')).toBeInTheDocument();
        });
    });

    it('filters products by price range', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const priceSelect = screen.getByLabelText('Filter by price range');
        await user.click(priceSelect);

        const underFiftyOption = screen.getByText('Under $50');
        await user.click(underFiftyOption);

        await waitFor(() => {
            expect(screen.getByText('Test Product 1')).toBeInTheDocument(); // $25
            expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument(); // $75
        });
    });

    it('sorts products correctly', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const sortSelect = screen.getByLabelText('Sort products');
        await user.click(sortSelect);

        const priceHighToLowOption = screen.getByText('Price (High to Low)');
        await user.click(priceHighToLowOption);

        await waitFor(() => {
            const productCards = screen.getAllByRole('gridcell');
            // Higher priced product (Test Product 2) should come first
            expect(productCards[0]).toHaveTextContent('Test Product 2');
            expect(productCards[1]).toHaveTextContent('Test Product 1');
        });
    });

    it('shows empty state when no products match filters', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const searchInput = screen.getByLabelText('Search products');
        await user.type(searchInput, 'nonexistent product');

        await waitFor(() => {
            expect(screen.getByText('No products found')).toBeInTheDocument();
            expect(screen.getByText('Try adjusting your search or filter criteria.')).toBeInTheDocument();
        });
    });

    it('handles add to cart action', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const addToCartButtons = screen.getAllByText('Add');
        await user.click(addToCartButtons[0]);

        expect(defaultProps.onAddToCart).toHaveBeenCalledWith(
            mockProducts[0],
            1 // default quantity
        );
    });

    it('handles wishlist toggle', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const wishlistButtons = screen.getAllByLabelText(/Add to wishlist|Remove from wishlist/);
        await user.click(wishlistButtons[0]);

        expect(defaultProps.onToggleWishlist).toHaveBeenCalledWith('prod-1');
    });

    it('shows different heart icon for wishlist items', () => {
        render(<ProductCatalog {...defaultProps} wishlistItems={['prod-1']} />);

        const heartIcons = screen.getAllByTestId('heart-icon');
        expect(heartIcons[0]).toHaveClass('fill-red-500', 'text-red-500');
    });

    it('handles quantity changes in cart inputs', async () => {
        const user = userEvent.setup();
        render(<ProductCatalog {...defaultProps} />);

        const quantityInputs = screen.getAllByLabelText('Quantity');
        await user.clear(quantityInputs[0]);
        await user.type(quantityInputs[0], '3');

        const addToCartButtons = screen.getAllByText('Add');
        await user.click(addToCartButtons[0]);

        expect(defaultProps.onAddToCart).toHaveBeenCalledWith(mockProducts[0], 3);
    });

    it('displays correct product count', () => {
        render(<ProductCatalog {...defaultProps} />);

        expect(screen.getByText('Showing 2 products')).toBeInTheDocument();
    });

    it('renders product links correctly', () => {
        render(<ProductCatalog {...defaultProps} />);

        const productLinks = screen.getAllByRole('link');
        expect(productLinks[0]).toHaveAttribute('href', '/store/merchant-1/products/prod-1');
    });

    it('handles empty products array', () => {
        render(<ProductCatalog {...defaultProps} products={[]} />);

        expect(screen.getByText('No products found')).toBeInTheDocument();
        expect(screen.getByText('Showing 0 products')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(<ProductCatalog {...defaultProps} className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('shows sale badge for products on sale', () => {
        const productsWithSale = [
            {
                ...mockProducts[0],
                sale_price: {
                    amount: 2000,
                    currency: 'USD'
                }
            }
        ];

        render(<ProductCatalog {...defaultProps} products={productsWithSale} />);

        expect(screen.getByText('Sale')).toBeInTheDocument();
    });

    it('is accessible with proper ARIA labels', () => {
        render(<ProductCatalog {...defaultProps} />);

        expect(screen.getByRole('main', { name: 'Product catalog' })).toBeInTheDocument();
        expect(screen.getByLabelText('Search products')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
        expect(screen.getByLabelText('Sort products')).toBeInTheDocument();
        expect(screen.getAllByRole('gridcell')).toHaveLength(2);
    });
});