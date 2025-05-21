import { useAuth } from '@clerk/nextjs';

export async function getToken(): Promise<string | null> {
    try {
        const { getToken } = useAuth();
        const token = await getToken();
        return token;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}