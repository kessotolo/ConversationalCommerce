import axios from 'axios';

export async function getAddresses() {
    const res = await axios.get('/api/v1/address_book/');
    return res.data;
}

export async function createAddress(data: any) {
    const res = await axios.post('/api/v1/address_book/', data);
    return res.data;
}

export async function updateAddress(id: string, data: any) {
    const res = await axios.put(`/api/v1/address_book/${id}`, data);
    return res.data;
}

export async function deleteAddress(id: string) {
    await axios.delete(`/api/v1/address_book/${id}`);
}

export async function setDefaultAddress(id: string) {
    const res = await axios.patch(`/api/v1/address_book/${id}/default`);
    return res.data;
}