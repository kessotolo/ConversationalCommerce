import axios from 'axios';

export async function getNotificationPreferences() {
    const res = await axios.get('/api/v1/notification_preferences/');
    return res.data;
}

export async function updateNotificationPreferences(data: any) {
    const res = await axios.patch('/api/v1/notification_preferences/', data);
    return res.data;
}