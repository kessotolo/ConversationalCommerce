import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import NotificationPreferences from './NotificationPreferences';
import Link from 'next/link';

// Placeholder components for notification preferences and account security
function AccountSecurity() {
    return (
        <div className="mt-8 p-4 bg-white rounded shadow border">
            <h2 className="text-lg font-semibold mb-2">Account Security</h2>
            <p className="text-gray-500">Coming soon: Change your password, set up 2FA, and manage devices here.</p>
        </div>
    );
}

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isLoaded && user) {
            setName(user.firstName || '');
            setEmail(user.primaryEmailAddress?.emailAddress || '');
            setPhone(user.phoneNumbers?.[0]?.phoneNumber || '');
        }
    }, [isLoaded, user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);
        try {
            // Clerk handles email/password; update name/phone via Clerk or your API
            if (user) {
                await user.update({
                    firstName: name,
                    // Clerk does not allow direct email/phone update here; use their flows if needed
                });
                setSuccess('Profile updated successfully!');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">My Profile</h1>
            <form onSubmit={handleSave} className="bg-white rounded shadow p-6 border">
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                        type="text"
                        className="w-full border rounded px-3 py-2"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        className="w-full border rounded px-3 py-2 bg-gray-100"
                        value={email}
                        disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">To change your email, use the account settings in the authentication provider.</p>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                        type="tel"
                        className="w-full border rounded px-3 py-2"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">To change your phone number, use the account settings in the authentication provider.</p>
                </div>
                {error && <div className="text-red-600 mb-2">{error}</div>}
                {success && <div className="text-green-600 mb-2">{success}</div>}
                <button
                    type="submit"
                    className="bg-[#6C9A8B] text-white px-4 py-2 rounded hover:bg-[#5d8a7b] transition"
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
            <NotificationPreferences />
            <div className="mt-8">
                <Link href="/account/address-book" className="text-blue-600 underline">Manage Address Book</Link>
            </div>
            <AccountSecurity />
        </div>
    );
}