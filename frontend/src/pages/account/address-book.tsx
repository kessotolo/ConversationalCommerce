import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/use-toast';
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../../../lib/api/addressBook';

interface Address {
    id: string;
    street: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
    apartment?: string;
    landmark?: string;
    coordinates?: { latitude: number; longitude: number };
    is_default: boolean;
}

const emptyAddress: Partial<Address> = {
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    apartment: '',
    landmark: '',
    coordinates: undefined,
    is_default: false,
};

export default function AddressBookPage() {
    const { toast } = useToast();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [editing, setEditing] = useState<Address | null>(null);
    const [form, setForm] = useState<Partial<Address>>(emptyAddress);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAddresses();
    }, []);

    async function fetchAddresses() {
        setLoading(true);
        try {
            const data = await getAddresses();
            setAddresses(data);
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to load addresses', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    function handleEdit(address: Address) {
        setEditing(address);
        setForm(address);
    }

    function handleCancel() {
        setEditing(null);
        setForm(emptyAddress);
    }

    async function handleSave() {
        setLoading(true);
        try {
            if (editing) {
                await updateAddress(editing.id, form);
                toast({ title: 'Updated', description: 'Address updated' });
            } else {
                await createAddress(form);
                toast({ title: 'Created', description: 'Address added' });
            }
            fetchAddresses();
            handleCancel();
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to save address', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        setLoading(true);
        try {
            await deleteAddress(id);
            toast({ title: 'Deleted', description: 'Address deleted' });
            fetchAddresses();
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to delete address', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleSetDefault(id: string) {
        setLoading(true);
        try {
            await setDefaultAddress(id);
            toast({ title: 'Default Set', description: 'Default address updated' });
            fetchAddresses();
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to set default', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h1>Address Book</h1>
            <Card>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleSave();
                    }}
                >
                    <Input
                        placeholder="Street"
                        value={form.street || ''}
                        onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                        required
                    />
                    <Input
                        placeholder="City"
                        value={form.city || ''}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        required
                    />
                    <Input
                        placeholder="State"
                        value={form.state || ''}
                        onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    />
                    <Input
                        placeholder="Postal Code"
                        value={form.postal_code || ''}
                        onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                    />
                    <Input
                        placeholder="Country"
                        value={form.country || ''}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        required
                    />
                    <Input
                        placeholder="Apartment"
                        value={form.apartment || ''}
                        onChange={e => setForm(f => ({ ...f, apartment: e.target.value }))}
                    />
                    <Input
                        placeholder="Landmark"
                        value={form.landmark || ''}
                        onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))}
                    />
                    <div style={{ marginTop: 8 }}>
                        <Button type="submit" disabled={loading}>
                            {editing ? 'Update Address' : 'Add Address'}
                        </Button>
                        {editing && (
                            <Button type="button" onClick={handleCancel} variant="secondary" style={{ marginLeft: 8 }}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            </Card>
            <div style={{ marginTop: 24 }}>
                {addresses.map(addr => (
                    <Card key={addr.id} style={{ marginBottom: 12, padding: 16 }}>
                        <div>
                            <strong>{addr.street}, {addr.city}, {addr.country}</strong>
                            {addr.is_default && <span style={{ marginLeft: 8, color: 'green' }}>(Default)</span>}
                        </div>
                        <div>{addr.state} {addr.postal_code}</div>
                        <div>{addr.apartment} {addr.landmark}</div>
                        <div style={{ marginTop: 8 }}>
                            <Button size="sm" onClick={() => handleEdit(addr)} disabled={loading}>Edit</Button>
                            <Button size="sm" onClick={() => handleDelete(addr.id)} variant="destructive" style={{ marginLeft: 8 }} disabled={loading}>Delete</Button>
                            {!addr.is_default && (
                                <Button size="sm" onClick={() => handleSetDefault(addr.id)} style={{ marginLeft: 8 }} disabled={loading}>Set Default</Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}