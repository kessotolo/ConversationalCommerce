import { render, screen, fireEvent } from '@testing-library/react';
import { TenantImpersonation } from '@/modules/tenant/components/TenantImpersonation';

describe('TenantImpersonation', () => {
    it('renders tenants and allows impersonation', () => {
        render(<TenantImpersonation />);
        expect(screen.getByText(/tenant impersonation/i)).toBeInTheDocument();
        expect(screen.getByText(/techcorp store/i)).toBeInTheDocument();
        fireEvent.click(screen.getAllByText(/impersonate/i)[0]);
        expect(screen.getByText(/start impersonation session/i)).toBeInTheDocument();
    });
});