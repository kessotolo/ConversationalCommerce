import axios from 'axios';

export interface Profile {
    id: string;
    name: string;
    email: string;
    phone: string;
}

export async function getProfile() {
    const res = await axios.get('/api/v1/profile/');
    return res.data as Profile;
}

export async function updateProfile(data: Partial<Profile>) {
    const res = await axios.patch('/api/v1/profile/', data);
    return res.data as Profile;
}
