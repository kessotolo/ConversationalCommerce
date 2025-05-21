import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function Dashboard() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        setToken(storedToken);
    }, []);

    return (
        <>
            <SignedIn>
                <div className="p-4">
                    <h1 className="text-xl font-bold mb-4">Welcome to your dashboard 🎯</h1>
                    <div className="bg-gray-100 p-4 rounded-lg">
                        <h2 className="font-semibold mb-2">Authentication Status:</h2>
                        <p>Token stored: {token ? '✅' : '❌'}</p>
                        {token && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">Token preview: {token.substring(0, 20)}...</p>
                            </div>
                        )}
                    </div>
                </div>
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    )
}
