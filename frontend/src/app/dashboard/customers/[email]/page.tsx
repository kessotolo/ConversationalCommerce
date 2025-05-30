import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChevronLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Mock orders data (should match main customers page)
const mockOrders = [
    { id: '1', customerName: 'John Doe', email: 'john@example.com', phone: '+234 123 456 7890', amount: 120.5, date: '2025-05-25T10:30:00' },
    { id: '2', customerName: 'Jane Smith', email: 'jane@example.com', phone: '+234 987 654 3210', amount: 85.99, date: '2025-05-24T14:45:00' },
    { id: '3', customerName: 'John Doe', email: 'john@example.com', phone: '+234 123 456 7890', amount: 210.75, date: '2025-05-23T09:15:00' },
];

export default function CustomerDetailPage({ params }: { params: { email: string } }) {
    const email = decodeURIComponent(params.email);
    const customerOrders = mockOrders.filter(o => o.email === email);
    if (customerOrders.length === 0) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                    <Link href="/dashboard/customers" className="inline-flex items-center text-[#6C9A8B] mb-6"><ChevronLeft className="h-4 w-4 mr-1" /> Back to Customers</Link>
                    <h2 className="text-xl font-bold mb-2">Customer not found</h2>
                    <p className="text-gray-500">No customer with this email exists.</p>
                </div>
            </DashboardLayout>
        );
    }
    const customer = {
        name: customerOrders[0].customerName,
        email: customerOrders[0].email,
        phone: customerOrders[0].phone,
        totalSpent: customerOrders.reduce((sum, o) => sum + o.amount, 0),
        orders: customerOrders,
    };
    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto px-4 py-8">
                <Link href="/dashboard/customers" className="inline-flex items-center text-[#6C9A8B] mb-6"><ChevronLeft className="h-4 w-4 mr-1" /> Back to Customers</Link>
                <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{customer.name}</h2>
                    <div className="text-gray-700 mb-1">{customer.email}</div>
                    <div className="text-gray-700 mb-1">{customer.phone}</div>
                    <div className="text-gray-700">Total Spent: <span className="font-semibold">₦{customer.totalSpent.toFixed(2)}</span></div>
                </div>
                <div className="bg-white rounded-2xl shadow border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-[#6C9A8B]" />
                        <span className="font-semibold text-gray-900">Orders</span>
                    </div>
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-[#f7faf9]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {customer.orders.map(order => (
                                <tr key={order.id}>
                                    <td className="px-6 py-4 font-mono text-gray-900">{order.id}</td>
                                    <td className="px-6 py-4">₦{order.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">{new Date(order.date).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}