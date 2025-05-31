import * as React from 'react';
'use client';
import { React, Record } from 'react';
import { Phone } from 'lucide-react';
// Removed circular import;
// Removed self-import
import { Users, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Mock orders data (replace with real data/API in production)
const mockOrders = [
    { id: '1', customerName: 'John Doe', email: 'john@example.com', phone: '+234 123 456 7890', amount: 120.5, date: '2025-05-25T10:30:00' },
    { id: '2', customerName: 'Jane Smith', email: 'jane@example.com', phone: '+234 987 654 3210', amount: 85.99, date: '2025-05-24T14:45:00' },
    { id: '3', customerName: 'John Doe', email: 'john@example.com', phone: '+234 123 456 7890', amount: 210.75, date: '2025-05-23T09:15:00' },
];

// Deduplicate customers
const customers = Object.values(
    mockOrders.reduce((acc, order) => {
        if (!acc[order.email]) {
            acc[order.email] = {
                name: order.customerName,
                email: order.email,
                phone: order.phone,
                orders: [],
                totalSpent: 0,
                lastOrder: order.date,
            };
        }
        acc[order.email].orders.push(order);
        acc[order.email].totalSpent += order.amount;
        if (new Date(order.date) > new Date(acc[order.email].lastOrder)) {
            acc[order.email].lastOrder = order.date;
        }
        return acc;
    }, {} as Record<string, any>)
);

export default function CustomersPage() {
    const [search, setSearch] = useState('');
    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
    );
    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="h-6 w-6 text-[#6C9A8B]" /> Customers</h1>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="pl-10 pr-3 py-2 rounded-lg border border-gray-200 w-full focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] bg-white"
                            placeholder="Search customers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-[#f7faf9]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filtered.map((c, idx) => (
                                <tr key={c.email} className="hover:bg-[#f7faf9] transition">
                                    <td className="px-6 py-4 font-semibold text-gray-900">{c.name}</td>
                                    <td className="px-6 py-4">{c.email}</td>
                                    <td className="px-6 py-4">{c.phone}</td>
                                    <td className="px-6 py-4">{c.orders.length}</td>
                                    <td className="px-6 py-4">₦{c.totalSpent.toFixed(2)}</td>
                                    <td className="px-6 py-4">{new Date(c.lastOrder).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <Link href={`/dashboard/customers/${encodeURIComponent(c.email)}`} className="text-[#6C9A8B] font-semibold hover:underline flex items-center">View <ChevronRight className="ml-1 h-4 w-4" /></Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}