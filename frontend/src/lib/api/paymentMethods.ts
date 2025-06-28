import axios from 'axios';

export async function getPaymentMethods() {
    const res = await axios.get('/api/v1/saved_payment_method/');
    return res.data;
}

export async function createPaymentMethod(data: any) {
    const res = await axios.post('/api/v1/saved_payment_method/', data);
    return res.data;
}

export async function deletePaymentMethod(id: string) {
    await axios.delete(`/api/v1/saved_payment_method/${id}`);
}