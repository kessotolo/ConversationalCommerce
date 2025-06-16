// API functions for onboarding flows
export const onboardingApi = {
    startOnboarding: async (data: any) => ({ status: 'success', tenant_id: 'mock-tenant-id' }),
    submitKYC: async (data: any) => ({ status: 'success', kyc_id: 'mock-kyc-id' }),
    setDomain: async (data: any) => ({ status: 'success' }),
    inviteTeam: async (data: { phone: string }) => ({ status: 'success', invite_link: 'https://wa.me/1234567890' }),
    uploadKYCFile: async (file: File) => ({ status: 'success', file_url: 'https://cloudinary.com/fake-url.jpg' }),
};

// Simulate domain validation (returns { available: boolean, message: string })
export const validateDomain = async (domain: string): Promise<{ available: boolean; message: string }> => {
    // Simulate a taken domain for demo
    if (!domain || domain.length < 3) return { available: false, message: 'Domain too short' };
    if (["taken", "admin", "shop"].includes(domain.toLowerCase())) return { available: false, message: 'Domain is already taken' };
    return { available: true, message: 'Domain is available' };
};

// Simulate sending an invite email
export const sendInviteEmail = async (email: string, link: string): Promise<{ status: string }> => {
    // Simulate success
    return { status: 'success' };
};