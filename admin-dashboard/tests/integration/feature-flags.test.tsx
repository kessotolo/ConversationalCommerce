import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureFlagManagement } from '@/modules/feature-flags/components/FeatureFlagManagement';

describe('FeatureFlagManagement', () => {
    it('renders feature flags and allows toggling', () => {
        render(<FeatureFlagManagement />);
        expect(screen.getByText(/feature flags/i)).toBeInTheDocument();
        expect(screen.getByText(/new checkout flow/i)).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('switch')[0]);
    });
});