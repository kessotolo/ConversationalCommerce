'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/use-toast';
import { getProfile, updateProfile } from '../../lib/api/profile';
import { getNotificationPreferences, updateNotificationPreferences } from '../../lib/api/notificationPreferences';

interface NotificationPrefs {
    id: string;
    email_enabled: boolean;
    sms_enabled: boolean;
    whatsapp_enabled: boolean;
    push_enabled: boolean;
}

interface ProfileForm {
    name: string;
    email: string;
    phone: string;
}

export default function AccountProfilePage() {
    const { toast } = useToast();
    const [profile, setProfile] = useState<ProfileForm>({ name: '', email: '', phone: '' });
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const [p, pr] = await Promise.all([getProfile(), getNotificationPreferences()]);
            setProfile({ name: p.name || '', email: p.email || '', phone: p.phone || '' });
            setPrefs(pr);
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveProfile() {
        setLoading(true);
        try {
            const updated = await updateProfile(profile);
            setProfile({ name: updated.name, email: updated.email, phone: updated.phone });
            toast({ title: 'Updated', description: 'Profile saved' });
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleToggle(field: keyof NotificationPrefs) {
        if (!prefs) return;
        setLoading(true);
        try {
            const updated = await updateNotificationPreferences({ [field]: !prefs[field] });
            setPrefs({ ...prefs, [field]: updated[field] });
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
            <h1>My Profile</h1>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSaveProfile(); }}>
                    <Input
                        placeholder="Name"
                        value={profile.name}
                        onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                        required
                    />
                    <Input
                        type="email"
                        placeholder="Email"
                        value={profile.email}
                        onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                        required
                    />
                    <Input
                        placeholder="Phone"
                        value={profile.phone}
                        onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                        required
                    />
                    <div style={{ marginTop: 8 }}>
                        <Button type="submit" disabled={loading}>Save Profile</Button>
                    </div>
                </form>
            </Card>

            <h2 style={{ marginTop: 24 }}>Notification Preferences</h2>
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

            <div style={{ marginTop: 24 }}>
                <Link href="/account/address-book" className="text-blue-600 underline">Manage Address Book</Link>
            </div>
        </div>
    );
}
