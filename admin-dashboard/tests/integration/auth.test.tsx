import { render, screen, waitFor } from '@testing-library/react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import AdminDashboard from '@/app/page';

describe('Admin Authentication Integration', () => {
    it('shows login screen when not authenticated', async () => {
        // Simulate not signed in
        jest.spyOn(require('@clerk/nextjs'), 'useAuth').mockReturnValue({ isSignedIn: false, isLoaded: true });
        render(
            <ClerkProvider publishableKey="test_key">
                <AdminDashboard />
            </ClerkProvider>
        );
        expect(screen.getByText(/sign in to access/i)).toBeInTheDocument();
    });

    it('shows dashboard when authenticated', async () => {
        jest.spyOn(require('@clerk/nextjs'), 'useAuth').mockReturnValue({ isSignedIn: true, isLoaded: true });
        render(
            <ClerkProvider publishableKey="test_key">
                <AdminDashboard />
            </ClerkProvider>
        );
        await waitFor(() => expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument());
    });
});