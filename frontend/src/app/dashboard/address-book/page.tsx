import { useState, useEffect } from 'react';

// Address type (should match backend and shared models)
interface Address {
    id: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    apartment?: string;
    landmark?: string;
    isDefault?: boolean;
}

function AddressForm({
    initial,
    onSave,
    onCancel,
}: {
    initial?: Partial<Address>;
    onSave: (address: Partial<Address>) => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState<Partial<Address>>(initial || {});
    const [error, setError] = useState<string | null>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.street || !form.city || !form.state || !form.country) {
            setError('Please fill in all required fields.');
            return;
        }
        setError(null);
        onSave(form);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div>
                <label className="block text-sm font-medium mb-1">Street *</label>
                <input name="street" value={form.street || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Apartment</label>
                <input name="apartment" value={form.apartment || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input name="city" value={form.city || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input name="state" value={form.state || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Postal Code</label>
                <input name="postalCode" value={form.postalCode || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Country *</label>
                <input name="country" value={form.country || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Landmark</label>
                <input name="landmark" value={form.landmark || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2 mt-2">
                <button type="submit" className="bg-[#6C9A8B] text-white px-4 py-2 rounded hover:bg-[#5d8a7b]">Save</button>
                <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    );
}

export default function AddressBookPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editAddress, setEditAddress] = useState<Address | null>(null);
    const [saving, setSaving] = useState(false);

    // Placeholder: Replace with real API calls
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setAddresses([
                {
                    id: '1',
                    street: '123 Main St',
                    city: 'Nairobi',
                    state: 'Nairobi',
                    postalCode: '00100',
                    country: 'Kenya',
                    isDefault: true,
                },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    function handleAdd() {
        setEditAddress(null);
        setShowForm(true);
    }

    function handleEdit(addr: Address) {
        setEditAddress(addr);
        setShowForm(true);
    }

    function handleDelete(id: string) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
    }

    function handleSave(addr: Partial<Address>) {
        setSaving(true);
        setTimeout(() => {
            if (editAddress) {
                setAddresses((prev) => prev.map((a) => (a.id === editAddress.id ? { ...a, ...addr } as Address : a)));
            } else {
                setAddresses((prev) => [
                    ...prev,
                    { ...addr, id: Math.random().toString(36).slice(2), isDefault: prev.length === 0 } as Address,
                ]);
            }
            setShowForm(false);
            setEditAddress(null);
            setSaving(false);
        }, 500);
    }

    function handleSetDefault(id: string) {
        setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">My Addresses</h1>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <button
                        className="mb-4 bg-[#6C9A8B] text-white px-4 py-2 rounded hover:bg-[#5d8a7b]"
                        onClick={handleAdd}
                    >
                        Add Address
                    </button>
                    {addresses.length === 0 ? (
                        <div className="text-gray-500">No addresses saved yet.</div>
                    ) : (
                        <ul className="space-y-4">
                            {addresses.map((addr) => (
                                <li key={addr.id} className="bg-white rounded shadow p-4 border flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="font-semibold">{addr.street}, {addr.city}, {addr.state}, {addr.country}</div>
                                        {addr.apartment && <div className="text-sm text-gray-500">Apt: {addr.apartment}</div>}
                                        {addr.landmark && <div className="text-sm text-gray-500">Landmark: {addr.landmark}</div>}
                                        <div className="text-xs text-gray-400">Postal: {addr.postalCode || '-'}</div>
                                        {addr.isDefault && <span className="inline-block text-xs text-green-600 font-semibold mt-1">Default</span>}
                                    </div>
                                    <div className="flex gap-2 mt-2 md:mt-0">
                                        {!addr.isDefault && (
                                            <button className="text-blue-600 underline" onClick={() => handleSetDefault(addr.id)}>
                                                Set Default
                                            </button>
                                        )}
                                        <button className="text-yellow-600 underline" onClick={() => handleEdit(addr)}>
                                            Edit
                                        </button>
                                        <button className="text-red-600 underline" onClick={() => handleDelete(addr.id)}>
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
                            ×
                        </button>
                        <h2 className="text-lg font-bold mb-4">{editAddress ? 'Edit Address' : 'Add Address'}</h2>
                        <AddressForm
                            initial={editAddress || {}}
                            onSave={handleSave}
                            onCancel={() => setShowForm(false)}
                        />
                        {saving && <div className="text-gray-500 mt-2">Saving...</div>}
                    </div>
                </div>
            )}
            {error && <div className="text-red-600 mt-4">{error}</div>}
        </div>
    );
}