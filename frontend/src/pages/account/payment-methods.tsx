import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/use-toast';
import { getPaymentMethods, createPaymentMethod, deletePaymentMethod } from '../../lib/api/paymentMethods';

interface PaymentMethod {
    id: string;
    type: string;
    details: any;
    is_default: boolean;
}

const emptyMethod: Partial<PaymentMethod> = {
    type: '',
    details: {},
    is_default: false,
};

export default function PaymentMethodsPage() {
    const { toast } = useToast();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [form, setForm] = useState<Partial<PaymentMethod>>(emptyMethod);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMethods();
    }, []);

    async function fetchMethods() {
        setLoading(true);
        try {
            const data = await getPaymentMethods();
            setMethods(data);
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to load payment methods', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setLoading(true);
        try {
            await createPaymentMethod(form);
            toast({ title: 'Created', description: 'Payment method added' });
            fetchMethods();
            setForm(emptyMethod);
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to save payment method', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        setLoading(true);
        try {
            await deletePaymentMethod(id);
            toast({ title: 'Deleted', description: 'Payment method deleted' });
            fetchMethods();
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to delete payment method', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h1>Saved Payment Methods</h1>
            <Card>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleSave();
                    }}
                >
                    <Input
                        placeholder="Type (e.g. CARD, MOBILE_MONEY)"
                        value={form.type || ''}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                        required
                    />
                    <Input
                        placeholder="Details (JSON)"
                        value={JSON.stringify(form.details || {})}
                        onChange={e => {
                            try {
                                setForm(f => ({ ...f, details: JSON.parse(e.target.value) }));
                            } catch {
                                // ignore parse error
                            }
                        }}
                        required
                    />
                    <div style={{ marginTop: 8 }}>
                        <Button type="submit" disabled={loading}>
                            Add Payment Method
                        </Button>
                    </div>
                </form>
            </Card>
            <div style={{ marginTop: 24 }}>
                {methods.map(method => (
                    <Card key={method.id} style={{ marginBottom: 12, padding: 16 }}>
                        <div>
                            <strong>{method.type}</strong> {method.is_default && <span style={{ marginLeft: 8, color: 'green' }}>(Default)</span>}
                        </div>
                        <div>{JSON.stringify(method.details)}</div>
                        <div style={{ marginTop: 8 }}>
                            <Button size="sm" onClick={() => handleDelete(method.id)} variant="destructive" disabled={loading}>Delete</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}