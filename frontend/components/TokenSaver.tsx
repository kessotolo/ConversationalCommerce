'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

export function TokenSaver() {
  const { getToken } = useAuth();

  useEffect(() => {
    const saveToken = async () => {
      const token = await getToken();
      if (token) {
        localStorage.setItem('token', token);
      }
    };

    saveToken();
  }, [getToken]);

  return null;
}
