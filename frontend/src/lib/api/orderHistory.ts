import axios from 'axios';

export async function getBuyerOrders() {
  const res = await axios.get('/api/v1/order_history/');
  return res.data;
}
