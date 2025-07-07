'use client'

import { useState, useEffect } from 'react';
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/lib/api/addressBook';
import { useToast } from '@/components/ui/use-toast';

// Address type (should match backend and shared models)
interface Address {
    id: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    apartment?: string;
    landmark?: string;
    coordinates?: { latitude: number; longitude: number };
    is_default: boolean;
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
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
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
                <input
                    name="street"
                    value={form.street || ''}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Apartment</label>
                <input
                    name="apartment"
                    value={form.apartment || ''}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                    name="city"
                    value={form.city || ''}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input
                    name="state"
                    value={form.state || ''}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Postal Code</label>
                <input
                    name="postal_code"
                    value={form.postal_code || ''}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Country *</label>
                <input
                    name="country"
                    value={form.country || ''}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Landmark</label>
                <input
                    name="landmark"
                    value={form.landmark || ''}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                />
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
    const { toast } = useToast();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editAddress, setEditAddress] = useState<Address | null>(null);
    const [saving, setSaving] = useState(false);

    // Real API call to fetch addresses
    useEffect(() => {
        fetchAddresses();
    }, []);

    async function fetchAddresses() {
        setLoading(true);
        setError(null);
        try {
            const data = await getAddresses();
            setAddresses(data);
        } catch (e) {
            const errorMessage = 'Failed to load addresses';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }

    function handleAdd() {
        setEditAddress(null);
        setShowForm(true);
    }

    function handleEdit(addr: Address) {
        setEditAddress(addr);
        setShowForm(true);
    }

    async function handleDelete(id: string) {
        setSaving(true);
        try {
            await deleteAddress(id);
            toast({
                title: 'Deleted',
                description: 'Address deleted successfully'
            });
            await fetchAddresses(); // Refresh the list
        } catch (e) {
            toast({
                title: 'Error',
                description: 'Failed to delete address',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleSave(addr: Partial<Address>) {
        setSaving(true);
        try {
            if (editAddress) {
                await updateAddress(editAddress.id, addr);
                toast({
                    title: 'Updated',
                    description: 'Address updated successfully'
                });
            } else {
                await createAddress(addr);
                toast({
                    title: 'Created',
                    description: 'Address added successfully'
                });
            }
            await fetchAddresses(); // Refresh the list
            setShowForm(false);
            setEditAddress(null);
        } catch (e) {
            toast({
                title: 'Error',
                description: 'Failed to save address',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleSetDefault(id: string) {
        setSaving(true);
        try {
            await setDefaultAddress(id);
            toast({
                title: 'Default Set',
                description: 'Default address updated successfully'
            });
            await fetchAddresses(); // Refresh the list
        } catch (e) {
            toast({
                title: 'Error',
                description: 'Failed to set default address',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">My Addresses</h1>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                    <p>{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C9A8B]"></div>
                    <span className="ml-2 text-gray-600">Loading addresses...</span>
                </div>
            ) : (
                <>
                    <button
                        className="mb-4 bg-[#6C9A8B] text-white px-4 py-2 rounded hover:bg-[#5d8a7b] disabled:opacity-50"
                        onClick={handleAdd}
                        disabled={saving}
                    >
                        Add Address
                    </button>

                    {addresses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>No addresses saved yet.</p>
                            <p className="text-sm mt-2">Add your first address to get started.</p>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {addresses.map((addr) => (
                                <li key={addr.id} className="bg-white rounded shadow p-4 border flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="font-semibold">
                                            {addr.street}, {addr.city}, {addr.state}, {addr.country}
                                        </div>
                                        {addr.apartment && (
                                            <div className="text-sm text-gray-500">Apt: {addr.apartment}</div>
                                        )}
                                        {addr.landmark && (
                                            <div className="text-sm text-gray-500">Landmark: {addr.landmark}</div>
                                        )}
                                        <div className="text-xs text-gray-400">
                                            Postal: {addr.postal_code || '-'}
                                        </div>
                                        {addr.is_default && (
                                            <span className="inline-block text-xs text-green-600 font-semibold mt-1">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-2 md:mt-0">
                                        {!addr.is_default && (
                                            <button
                                                className="text-blue-600 underline disabled:opacity-50"
                                                onClick={() => handleSetDefault(addr.id)}
                                                disabled={saving}
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button
                                            className="text-yellow-600 underline disabled:opacity-50"
                                            onClick={() => handleEdit(addr)}
                                            disabled={saving}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="text-red-600 underline disabled:opacity-50"
                                            onClick={() => handleDelete(addr.id)}
                                            disabled={saving}
                                        >
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
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
                        <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
                            onClick={() => setShowForm(false)}
                            disabled={saving}
                        >
                            ×
                        </button>
                        <h2 className="text-lg font-bold mb-4">
                            {editAddress ? 'Edit Address' : 'Add Address'}
                        </h2>
                        <AddressForm
                            initial={editAddress || {}}
                            onSave={handleSave}
                            onCancel={() => setShowForm(false)}
                        />
                        {saving && (
                            <div className="mt-4 flex items-center justify-center text-gray-500">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#6C9A8B] mr-2"></div>
                                Saving...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}