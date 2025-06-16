// API functions for onboarding flows
export const onboardingApi = {
    startOnboarding: async (data: any) => ({ status: 'success', tenant_id: 'mock-tenant-id' }),
    submitKYC: async (data: any) => ({ status: 'success', kyc_id: 'mock-kyc-id' }),
    setDomain: async (data: any) => ({ status: 'success' }),
    inviteTeam: async (data: { phone: string }) => ({ status: 'success', invite_link: 'https://wa.me/1234567890' }),
    uploadKYCFile: async (file: File) => ({ status: 'success', file_url: 'https://cloudinary.com/fake-url.jpg' }),
};