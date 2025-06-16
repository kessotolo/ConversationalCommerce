import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingChatWizard from './OnboardingChatWizard';

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: { id: 'user-1', publicMetadata: { tenantId: 'tenant-1' } } }),
    useOrganization: () => ({ organization: { id: 'tenant-1' } }),
}));

// Mock ConversationEventLogger
jest.mock('@/modules/conversation/utils/eventLogger', () => ({
    ConversationEventLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

// Mock API functions
jest.mock('../api/onboardingApi', () => ({
    onboardingApi: {
        uploadKYCFile: jest.fn().mockImplementation(async (file) => {
            if (file.name === 'fail.pdf') throw new Error('Upload failed');
            return { status: 'success', file_url: 'https://cloudinary.com/fake-url.jpg' };
        }),
        startOnboarding: jest.fn().mockResolvedValue({ status: 'success', tenant_id: 'mock-tenant-id' }),
        submitKYC: jest.fn().mockResolvedValue({ status: 'success', kyc_id: 'mock-kyc-id' }),
        setDomain: jest.fn().mockResolvedValue({ status: 'success' }),
        inviteTeam: jest.fn().mockResolvedValue({ status: 'success', invite_link: 'https://wa.me/1234567890' }),
    }
}));

describe('OnboardingChatWizard', () => {
    it('renders initial system message', () => {
        render(<OnboardingChatWizard />);
        expect(screen.getByText(/let's set up your store/i)).toBeInTheDocument();
    });

    it('handles user input and advances steps', async () => {
        render(<OnboardingChatWizard />);
        const input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'My Business' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => expect(screen.getByText(/what's your phone number/i)).toBeInTheDocument());
    });

    it('handles file upload success', async () => {
        render(<OnboardingChatWizard />);
        // Advance to kycUpload step
        const input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'My Business' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/what's your phone number/i));
        fireEvent.change(input, { target: { value: '+1234567890' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/email address/i));
        fireEvent.change(input, { target: { value: 'test@example.com' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/upload your id/i));
        // Simulate file upload
        const fileInput = screen.getByLabelText(/kyc document/i);
        const file = new File(['dummy'], 'id.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => screen.getByText(/id uploaded/i));
    });

    it('handles file upload error', async () => {
        render(<OnboardingChatWizard />);
        // Advance to kycUpload step
        const input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'My Business' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/what's your phone number/i));
        fireEvent.change(input, { target: { value: '+1234567890' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/email address/i));
        fireEvent.change(input, { target: { value: 'test@example.com' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/upload your id/i));
        // Simulate file upload error
        const fileInput = screen.getByLabelText(/kyc document/i);
        const failFile = new File(['fail'], 'fail.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [failFile] } });
        // Assert error by test id
        expect(await screen.findByTestId('onboarding-error')).toHaveTextContent(/failed to upload file/i);
    });

    it('logs events for key actions', async () => {
        const { ConversationEventLogger } = require('@/modules/conversation/utils/eventLogger');
        render(<OnboardingChatWizard />);
        const input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'My Business' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => expect(ConversationEventLogger.log).toHaveBeenCalledWith(
            expect.objectContaining({ event_type: expect.any(String) })
        ));
    });

    it('completes onboarding flow', async () => {
        render(<OnboardingChatWizard />);
        let input = screen.getByPlaceholderText(/type your answer/i);
        // Simulate full flow
        fireEvent.change(input, { target: { value: 'My Business' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/phone number/i));
        input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: '+1234567890' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/email address/i));
        input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'test@example.com' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/upload your id/i));
        // File upload
        const fileInput = screen.getByLabelText(/kyc document/i);
        const file = new File(['dummy'], 'id.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => screen.getByText(/id uploaded/i));
        input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'passport' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/government-issued id number/i));
        input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'A1234567' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/subdomain/i));
        input = screen.getByPlaceholderText(/type your answer/i);
        fireEvent.change(input, { target: { value: 'myshop' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => screen.getByText(/invite a team member/i));
        // Instead of submitting again, just check for the completion message after simulating 'no'
        input = screen.queryByPlaceholderText(/type your answer/i);
        if (input) {
            fireEvent.change(input, { target: { value: 'no' } });
            fireEvent.submit(input.closest('form')!);
        }
        await waitFor(() => {
            expect(
                screen.getByText((content, node) =>
                    /onboarding complete/i.test(content)
                )
            ).toBeInTheDocument();
        });
    });
});