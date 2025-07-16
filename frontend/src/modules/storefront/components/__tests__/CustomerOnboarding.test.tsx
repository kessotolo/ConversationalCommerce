import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerOnboarding } from '../CustomerOnboarding';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    X: () => <div data-testid="close-icon" />,
    ShoppingBag: () => <div data-testid="shopping-bag-icon" />,
    Heart: () => <div data-testid="heart-icon" />,
    Bell: () => <div data-testid="bell-icon" />,
    Gift: () => <div data-testid="gift-icon" />
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

const defaultProps = {
    merchantName: 'Test Store',
    merchantId: 'merchant-123',
    onComplete: jest.fn(),
    onSkip: jest.fn(),
    className: ''
};

describe('CustomerOnboarding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('does not show modal if user has already been onboarded', () => {
        localStorageMock.getItem.mockReturnValue('true');
        render(<CustomerOnboarding {...defaultProps} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows modal after delay for new users', async () => {
        render(<CustomerOnboarding {...defaultProps} />);

        // Should not be visible immediately
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        // Should appear after delay
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        expect(screen.getByText('Welcome to Test Store!')).toBeInTheDocument();
    });

    it('starts with welcome step', async () => {
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        expect(screen.getByText('Welcome to Test Store!')).toBeInTheDocument();
        expect(screen.getByText('Discover amazing products and enjoy a personalized shopping experience.')).toBeInTheDocument();
    });

    it('displays progress indicator correctly', async () => {
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars).toHaveLength(3);

        // First step should be active
        expect(progressBars[0]).toHaveAttribute('aria-valuenow', '1');
        expect(progressBars[1]).toHaveAttribute('aria-valuenow', '2');
        expect(progressBars[2]).toHaveAttribute('aria-valuenow', '3');
    });

    it('navigates through steps correctly', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Start at welcome step
        expect(screen.getByText('Welcome to Test Store!')).toBeInTheDocument();

        // Go to preferences step
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);

        expect(screen.getByText('Stay Updated')).toBeInTheDocument();
        expect(screen.getByLabelText('Email (Optional)')).toBeInTheDocument();

        // Go to interests step
        await user.click(screen.getByText('Next'));

        expect(screen.getByText('Tell Us What You Love')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    it('allows going back through steps', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Navigate to interests step
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));

        expect(screen.getByText('Tell Us What You Love')).toBeInTheDocument();

        // Go back to preferences
        await user.click(screen.getByText('Back'));
        expect(screen.getByText('Stay Updated')).toBeInTheDocument();

        // Go back to welcome
        await user.click(screen.getByText('Back'));
        expect(screen.getByText('Welcome to Test Store!')).toBeInTheDocument();
    });

    it('handles email input correctly', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Navigate to preferences step
        await user.click(screen.getByText('Next'));

        const emailInput = screen.getByLabelText('Email (Optional)');
        await user.type(emailInput, 'test@example.com');

        expect(emailInput).toHaveValue('test@example.com');
    });

    it('handles notification preferences correctly', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Navigate to preferences step
        await user.click(screen.getByText('Next'));

        const newProductsCheckbox = screen.getByLabelText('New product launches');
        const salesCheckbox = screen.getByLabelText('Sales and discounts');

        // Should be checked by default
        expect(newProductsCheckbox).toBeChecked();
        expect(salesCheckbox).toBeChecked();

        // Uncheck one
        await user.click(newProductsCheckbox);
        expect(newProductsCheckbox).not.toBeChecked();
    });

    it('handles interest selection correctly', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Navigate to interests step
        await user.click(screen.getByText('Next'));
        await user.click(screen.getByText('Next'));

        const electronicsButton = screen.getByText('Electronics');
        const fashionButton = screen.getByText('Fashion & Style');

        // Select interests
        await user.click(electronicsButton);
        await user.click(fashionButton);

        expect(electronicsButton).toHaveAttribute('aria-pressed', 'true');
        expect(fashionButton).toHaveAttribute('aria-pressed', 'true');

        // Should show selection count
        expect(screen.getByText('2 interests selected')).toBeInTheDocument();
    });

    it('completes onboarding and saves preferences', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Navigate through steps and add preferences
        await user.click(screen.getByText('Next'));

        // Add email
        const emailInput = screen.getByLabelText('Email (Optional)');
        await user.type(emailInput, 'test@example.com');

        await user.click(screen.getByText('Next'));

        // Select interests
        await user.click(screen.getByText('Electronics'));

        // Complete onboarding
        await user.click(screen.getByText('Get Started'));

        // Should mark as onboarded and save preferences
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'customer-onboarded-merchant-123',
            'true'
        );
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'customer-preferences-merchant-123',
            expect.stringContaining('test@example.com')
        );

        // Should call onComplete
        expect(defaultProps.onComplete).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'test@example.com',
                interests: ['electronics']
            })
        );
    });

    it('handles skip functionality', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Skip from welcome step
        await user.click(screen.getByText('Skip'));

        // Should mark as onboarded
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'customer-onboarded-merchant-123',
            'true'
        );

        // Should call onSkip
        expect(defaultProps.onSkip).toHaveBeenCalled();
    });

    it('handles close button', async () => {
        const user = userEvent.setup();
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        const closeButton = screen.getByLabelText('Close onboarding');
        await user.click(closeButton);

        expect(defaultProps.onSkip).toHaveBeenCalled();
    });

    it('is accessible with proper ARIA attributes', async () => {
        render(<CustomerOnboarding {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        }, { timeout: 2000 });

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title');

        const title = screen.getByText('Welcome to Test Store!');
        expect(title).toHaveAttribute('id', 'onboarding-title');
    });

    it('applies custom className', () => {
        localStorageMock.getItem.mockReturnValue('true');
        const { container } = render(<CustomerOnboarding {...defaultProps} className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });
});