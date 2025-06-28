import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { render, testWizardStep, uploadFile, createMockFile } from '../utils/test-utils';
import OnboardingWizard from '@/modules/tenant/components/OnboardingWizard';
import { validateDomain } from '@/modules/tenant/api/onboardingApi';

// Mock the onboarding API
jest.mock('@/modules/tenant/api/onboardingApi', () => ({
  onboardingApi: {
    startOnboarding: jest.fn().mockResolvedValue({}),
    uploadKYCFile: jest.fn().mockResolvedValue({ success: true }),
    submitKYC: jest.fn().mockResolvedValue({ success: true }),
    setDomain: jest.fn().mockResolvedValue({ success: true }),
    inviteTeam: jest.fn().mockResolvedValue({ success: true }),
  },
  validateDomain: jest.fn().mockResolvedValue({ available: true }),
}));

// Mock the contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({ user: { id: 'user-123' } }),
}));

jest.mock('@/contexts/TenantContext', () => ({
  useTenant: jest.fn().mockReturnValue({ tenant: { id: 'tenant-123' } }),
}));

// Mock the auth utils
jest.mock('@/utils/auth-utils', () => ({
  getStoredAuthToken: jest.fn().mockReturnValue('mock-token'),
}));

describe('Onboarding Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    render(<OnboardingWizard />);
  });

  test('Complete Onboarding Flow - Happy Path', async () => {
    // Step 1: Business Info
    await testWizardStep({
      stepName: 'Business Info',
      fillData: {
        'Business Name': 'Test Business',
        'Phone': '+2348012345678',
        'Email': 'test@example.com',
      },
      verifyAfterSubmit: async () => {
        await waitFor(() => {
          expect(screen.getByText(/KYC/i)).toBeInTheDocument();
        });
      },
    });

    // Step 2: KYC
    await testWizardStep({
      stepName: 'KYC',
      fillData: {
        'ID Type': 'Passport',
      },
      verifyAfterSubmit: async () => {
        await waitFor(() => {
          expect(screen.getByText(/KYC Upload/i)).toBeInTheDocument();
        });
      },
    });

    // Step 3: KYC Upload
    const file = createMockFile('passport.jpg', 'image/jpeg', 1024);
    const uploadButton = screen.getByTestId('submit-button');
    
    // Upload KYC file
    await uploadFile('Upload ID', file);
    uploadButton.click();

    // Step 4: Domain
    await waitFor(() => {
      expect(screen.getByText(/Domain/i)).toBeInTheDocument();
    });

    await testWizardStep({
      stepName: 'Domain',
      fillData: {
        'Subdomain': 'testbusiness',
      },
      verifyBeforeSubmit: async () => {
        // Validate domain should be called
        expect(validateDomain).toHaveBeenCalledWith('testbusiness');
      },
      verifyAfterSubmit: async () => {
        await waitFor(() => {
          expect(screen.getByText(/Team Invite/i)).toBeInTheDocument();
        });
      },
    });

    // Step 5: Team Invite
    await testWizardStep({
      stepName: 'Team Invite',
      fillData: {
        'Phone Number': '+2348087654321',
      },
      verifyAfterSubmit: async () => {
        await waitFor(() => {
          expect(screen.getByText(/Done/i)).toBeInTheDocument();
        });
      },
    });

    // Final step should show completion message
    await waitFor(() => {
      const completionIndicators = [
        screen.queryAllByText(/congratulations|all set|finished|complete|done/i).length > 0,
        screen.queryAllByText(/onboarding complete|ready to start selling/i).length > 0,
      ];
      
      expect(completionIndicators.some(indicator => indicator)).toBe(true);
    });
  });

  test('Domain Already Taken Scenario', async () => {
    // Override the validateDomain mock for this test
    (validateDomain as jest.Mock).mockResolvedValueOnce({ 
      available: false, 
      message: 'Domain is already taken' 
    });

    // Progress to the domain step
    await testWizardStep({
      stepName: 'Business Info',
      fillData: {
        'Business Name': 'Test Business',
        'Phone': '+2348012345678',
        'Email': 'test@example.com',
      }
    });

    await testWizardStep({
      stepName: 'KYC',
      fillData: {
        'ID Type': 'Passport',
      }
    });

    const file = createMockFile('passport.jpg', 'image/jpeg', 1024);
    await uploadFile('Upload ID', file);
    screen.getByTestId('submit-button').click();

    // Wait for domain step
    await waitFor(() => {
      expect(screen.getByText(/Domain/i)).toBeInTheDocument();
    });

    // Try a taken domain
    await testWizardStep({
      stepName: 'Domain',
      fillData: {
        'Subdomain': 'taken',
      },
      verifyAfterSubmit: async () => {
        await waitFor(() => {
          expect(screen.getByText(/Domain is already taken/i)).toBeInTheDocument();
        });
      }
    });
  });

  test('KYC File Upload Failure', async () => {
    // Override the uploadKYCFile mock to simulate failure
    jest.spyOn(require('@/modules/tenant/api/onboardingApi').onboardingApi, 'uploadKYCFile')
      .mockRejectedValueOnce(new Error('Failed to upload KYC file'));

    // Progress to the KYC upload step
    await testWizardStep({
      stepName: 'Business Info',
      fillData: {
        'Business Name': 'Test Business',
        'Phone': '+2348012345678',
        'Email': 'test@example.com',
      }
    });

    await testWizardStep({
      stepName: 'KYC',
      fillData: {
        'ID Type': 'Passport',
      }
    });

    // Attempt to upload file that will fail
    const file = createMockFile('passport.jpg', 'image/jpeg', 1024);
    await uploadFile('Upload ID', file);
    screen.getByTestId('submit-button').click();

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to upload KYC file/i)).toBeInTheDocument();
    });
  });
});
