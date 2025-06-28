import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/use-toast';
import { getNotificationPreferences, updateNotificationPreferences } from '../../../lib/api/notificationPreferences';

interface NotificationPreferences {
    id: string;
    email_enabled: boolean;
    sms_enabled: boolean;
    whatsapp_enabled: boolean;
    push_enabled: boolean;
}

export default function NotificationPreferencesPage() {
    const { toast } = useToast();
    const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPrefs();
    }, []);

    async function fetchPrefs() {
        setLoading(true);
        try {
            const data = await getNotificationPreferences();
            setPrefs(data);
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to load preferences', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleToggle(field: keyof NotificationPreferences) {
        if (!prefs) return;
        setLoading(true);
        try {
            const updated = { ...prefs, [field]: !prefs[field] };
            await updateNotificationPreferences({ [field]: updated[field] });
            setPrefs(updated);
            toast({ title: 'Updated', description: 'Preferences updated' });
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to update preferences', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    if (!prefs) return <div>Loading...</div>;

    return (
        <div>
            <h1>Notification Preferences</h1>
            <Card>
                <div>
                    <label>
                        <input type="checkbox" checked={prefs.email_enabled} onChange={() => handleToggle('email_enabled')} disabled={loading} />
                        Email
                    </label>
                </div>
                <div>
                    <label>
                        <input type="checkbox" checked={prefs.sms_enabled} onChange={() => handleToggle('sms_enabled')} disabled={loading} />
                        SMS
                    </label>
                </div>
                <div>
                    <label>
                        <input type="checkbox" checked={prefs.whatsapp_enabled} onChange={() => handleToggle('whatsapp_enabled')} disabled={loading} />
                        WhatsApp
                    </label>
                </div>
                <div>
                    <label>
                        <input type="checkbox" checked={prefs.push_enabled} onChange={() => handleToggle('push_enabled')} disabled={loading} />
                        Push Notifications
                    </label>
                </div>
            </Card>
        </div>
    );
}