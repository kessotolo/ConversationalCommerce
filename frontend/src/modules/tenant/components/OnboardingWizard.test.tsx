import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingWizard from './OnboardingWizard';

jest.mock('../api/onboardingApi', () => ({
    onboardingApi: {
        uploadKYCFile: jest.fn().mockImplementation(async (file) => {
            if (file.name === 'fail.pdf') throw new Error('Upload failed');
            return { status: 'success', file_url: 'https://cloudinary.com/fake-url.jpg' };
        }),
        inviteTeam: jest.fn().mockResolvedValue({ status: 'success', invite_link: 'https://wa.me/1234567890' }),
    },
    validateDomain: jest.fn(async (domain) => {
        if (!domain || domain.length < 3) return { available: false, message: 'Domain too short' };
        if (["taken", "admin", "shop"].includes(domain.toLowerCase())) return { available: false, message: 'Domain is already taken' };
        return { available: true, message: 'Domain is available' };
    }),
    sendInviteEmail: jest.fn().mockResolvedValue({ status: 'success' }),
}));

describe('OnboardingWizard', () => {
    it('completes the happy path onboarding flow', async () => {
        render(<OnboardingWizard />);
        // Step 1: Business Info
        fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'My Shop' } });
        fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '+2348012345678' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        // Step 2: KYC
        await waitFor(() => screen.getByLabelText(/id type/i));
        fireEvent.change(screen.getByLabelText(/id type/i), { target: { value: 'Passport' } });
        fireEvent.change(screen.getByLabelText(/id number/i), { target: { value: 'A1234567' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        // Step 3: KYC Upload
        await waitFor(() => screen.getByLabelText(/kyc document/i));
        const file = new File(['dummy'], 'id.pdf', { type: 'application/pdf' });
        fireEvent.change(screen.getByLabelText(/kyc document/i), { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => screen.getByText(/kyc status: pending/i));
        await waitFor(() => screen.getByText(/kyc status: verified/i), { timeout: 3000 });
        // Step 4: Domain
        fireEvent.change(screen.getByLabelText(/subdomain/i), { target: { value: 'myshop' } });
        await waitFor(() => screen.getByText(/domain is available/i));
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        // Step 5: Team Invite
        await waitFor(() => screen.getByText(/team member phone/i));
        fireEvent.change(screen.getByLabelText(/team member phone/i), { target: { value: '+2348012345678' } });
        fireEvent.click(screen.getByRole('button', { name: /send whatsapp invite/i }));
        await waitFor(() => screen.getByText(/whatsapp invite link generated/i));
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        // Step 6: Done
        await waitFor(() => screen.getByText(/onboarding complete/i));
    });

    it('shows error for taken domain', async () => {
        render(<OnboardingWizard />);
        // Go to domain step
        fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'My Shop' } });
        fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '+2348012345678' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        fireEvent.change(screen.getByLabelText(/id type/i), { target: { value: 'Passport' } });
        fireEvent.change(screen.getByLabelText(/id number/i), { target: { value: 'A1234567' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        const file = new File(['dummy'], 'id.pdf', { type: 'application/pdf' });
        fireEvent.change(screen.getByLabelText(/kyc document/i), { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => screen.getByText(/kyc status: pending/i));
        await waitFor(() => screen.getByText(/kyc status: verified/i), { timeout: 3000 });
        fireEvent.change(screen.getByLabelText(/subdomain/i), { target: { value: 'taken' } });
        await waitFor(() => screen.getByText(/domain is already taken/i));
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => screen.getByRole('alert'));
        expect(screen.getByRole('alert')).toHaveTextContent(/domain is already taken/i);
    });

    it('shows error for KYC upload failure', async () => {
        render(<OnboardingWizard />);
        // Go to KYC upload step
        fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'My Shop' } });
        fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '+2348012345678' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        fireEvent.change(screen.getByLabelText(/id type/i), { target: { value: 'Passport' } });
        fireEvent.change(screen.getByLabelText(/id number/i), { target: { value: 'A1234567' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        const file = new File(['fail'], 'fail.pdf', { type: 'application/pdf' });
        fireEvent.change(screen.getByLabelText(/kyc document/i), { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => screen.getByRole('alert'));
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to upload file/i);
    });

    it('shows error for missing required fields', async () => {
        render(<OnboardingWizard />);
        // Try to submit business info with missing phone
        fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'My Shop' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => screen.getByRole('alert'));
        expect(screen.getByRole('alert')).toHaveTextContent(/business name and phone are required/i);
    });
});