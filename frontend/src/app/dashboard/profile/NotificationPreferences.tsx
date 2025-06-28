import { useEffect, useState } from 'react';

interface NotificationPreferences {
    email_enabled: boolean;
    sms_enabled: boolean;
    whatsapp_enabled: boolean;
    push_enabled: boolean;
}

export default function NotificationPreferences() {
    const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch('/api/v1/notification-preferences/', { credentials: 'include' })
            .then(async (res) => {
                if (!res.ok) throw new Error('Failed to load preferences');
                return res.json();
            })
            .then((data) => {
                setPrefs(data);
                setError(null);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    function handleToggle(field: keyof NotificationPreferences) {
        if (!prefs) return;
        setPrefs({ ...prefs, [field]: !prefs[field] });
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!prefs) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch('/api/v1/notification-preferences/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs),
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to update preferences');
            setSuccess('Preferences updated!');
        } catch (err: any) {
            setError(err.message || 'Failed to update preferences');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="mt-8">Loading notification preferences...</div>;
    if (error) return <div className="mt-8 text-red-600">{error}</div>;
    if (!prefs) return null;

    return (
        <div className="mt-8 p-4 bg-white rounded shadow border max-w-lg">
            <h2 className="text-lg font-semibold mb-2">Notification Preferences</h2>
            <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="email_enabled"
                        checked={prefs.email_enabled}
                        onChange={() => handleToggle('email_enabled')}
                    />
                    <label htmlFor="email_enabled" className="text-sm">Email Notifications</label>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="sms_enabled"
                        checked={prefs.sms_enabled}
                        onChange={() => handleToggle('sms_enabled')}
                    />
                    <label htmlFor="sms_enabled" className="text-sm">SMS Notifications</label>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="whatsapp_enabled"
                        checked={prefs.whatsapp_enabled}
                        onChange={() => handleToggle('whatsapp_enabled')}
                    />
                    <label htmlFor="whatsapp_enabled" className="text-sm">WhatsApp Notifications</label>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="push_enabled"
                        checked={prefs.push_enabled}
                        onChange={() => handleToggle('push_enabled')}
                    />
                    <label htmlFor="push_enabled" className="text-sm">Push Notifications</label>
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
                <button
                    type="submit"
                    className="bg-[#6C9A8B] text-white px-4 py-2 rounded hover:bg-[#5d8a7b] transition"
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Preferences'}
                </button>
            </form>
        </div>
    );
}