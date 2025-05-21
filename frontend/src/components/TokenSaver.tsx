import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function TokenSaver() {
    const { getToken } = useAuth();

    useEffect(() => {
        const saveToken = async () => {
            try {
                const token = await getToken();
                if (token) {
                    localStorage.setItem('token', token);
                }
            } catch (error) {
                console.error('Error saving token:', error);
            }
        };

        saveToken();
    }, [getToken]);

    return null;
}