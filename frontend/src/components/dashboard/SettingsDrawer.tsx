import React, { useState } from 'react';
import { X, Store, CreditCard, User, Bell, Globe } from 'lucide-react';

const categories = [
    { key: 'general', label: 'General', icon: Store },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    { key: 'users', label: 'Users', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'domains', label: 'Domains', icon: Globe },
];

const mockContent = {
    general: (
        <div>
            <h2 className="text-lg font-bold mb-2">General Settings</h2>
            <div className="bg-white rounded-xl shadow p-4 mb-4 border border-[#e6f0eb]">
                <p className="text-sm text-gray-700 mb-2">Store Name</p>
                <input className="w-full border rounded-lg px-3 py-2" defaultValue="Fashion Haven" />
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-[#e6f0eb]">
                <p className="text-sm text-gray-700 mb-2">Store Email</p>
                <input className="w-full border rounded-lg px-3 py-2" defaultValue="contact@fashionhaven.com" />
            </div>
        </div>
    ),
    billing: (
        <div>
            <h2 className="text-lg font-bold mb-2">Billing</h2>
            <div className="bg-white rounded-xl shadow p-4 border border-[#e6f0eb]">Billing info and payment methods go here.</div>
        </div>
    ),
    users: (
        <div>
            <h2 className="text-lg font-bold mb-2">Users</h2>
            <div className="bg-white rounded-xl shadow p-4 border border-[#e6f0eb]">Manage team members and permissions here.</div>
        </div>
    ),
    notifications: (
        <div>
            <h2 className="text-lg font-bold mb-2">Notifications</h2>
            <div className="bg-white rounded-xl shadow p-4 border border-[#e6f0eb]">Notification preferences and templates.</div>
        </div>
    ),
    domains: (
        <div>
            <h2 className="text-lg font-bold mb-2">Domains</h2>
            <div className="bg-white rounded-xl shadow p-4 border border-[#e6f0eb]">Manage your store domains here.</div>
        </div>
    ),
};

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [selected, setSelected] = useState('general');
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/30 transition-opacity" onClick={onClose} />
            {/* Drawer */}
            <div className="relative ml-auto h-full w-full max-w-md sm:max-w-lg bg-[#f7faf9] shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6f0eb] bg-white">
                    <h1 className="text-lg font-bold">Settings</h1>
                    <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>
                {/* Nav */}
                <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                    <nav className="flex sm:flex-col gap-2 p-4 sm:w-48 bg-[#f7faf9] border-b sm:border-b-0 sm:border-r border-[#e6f0eb]">
                        {categories.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setSelected(cat.key)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selected === cat.key ? 'bg-[#e8f6f1] text-[#6C9A8B] font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <cat.icon className="h-5 w-5" />
                                {cat.label}
                            </button>
                        ))}
                    </nav>
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">{mockContent[selected as keyof typeof mockContent]}</div>
                </div>
            </div>
        </div>
    );
}