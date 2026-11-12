import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, ArrowUpRight, DollarSign, Users } from 'lucide-react';
import { getAllInvoices } from '../services/invoiceService';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations';
import { getActiveProfile } from '../services/settingsService';

export default function Dashboard() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeProfile, setActiveProfile] = useState(null);

    useEffect(() => {
        loadInvoices();
        const profile = getActiveProfile();
        setActiveProfile(profile);
    }, []);

    const loadInvoices = () => {
        const data = getAllInvoices();
        setInvoices(data);
        setLoading(false);
    };

    const totalAmount = invoices.reduce((sum, inv) => {
        const { total } = calculateInvoiceTotals(inv);
        return sum + total;
    }, 0);

    // Calculate paid and unpaid balances per client
    const clientDebts = {};
    invoices.forEach(inv => {
        const clientName = inv.recipient.name;
        const { total, balance } = calculateInvoiceTotals(inv);
        const received = inv.received || 0;
        const unpaid = Math.max(0, balance);
        const paid = Math.min(total, received);

        if (!clientDebts[clientName]) {
            clientDebts[clientName] = { total: 0, paid: 0, count: 0, clientName };
        }

        clientDebts[clientName].total += unpaid;
        clientDebts[clientName].paid += paid;
        if (unpaid > 0) {
            clientDebts[clientName].count += 1;
        }
    });

    // Convert to array and sort by debt amount (highest first)
    const clientDebtsArray = Object.values(clientDebts)
        .filter(c => c.total > 0 || c.paid > 0) // Show all clients with activity
        .sort((a, b) => b.total - a.total);

    const totalOutstanding = clientDebtsArray.reduce((sum, c) => sum + c.total, 0);

    const recentInvoices = invoices.slice(0, 5); // Only show top 5

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 font-medium">
                        {activeProfile
                            ? `Welcome back, ${activeProfile.name}`
                            : 'Welcome back'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/create')}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                    <Plus size={18} /> New Invoice
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-slate-500 font-bold text-sm">Total Revenue</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">
                        {totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-orange-50 p-3 rounded-full text-orange-600">
                            <FileText size={24} />
                        </div>
                        <span className="text-slate-500 font-bold text-sm">Total Invoices</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{invoices.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-green-50 p-3 rounded-full text-green-600">
                            <Users size={24} />
                        </div>
                        <span className="text-slate-500 font-bold text-sm">Clients</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">
                        {new Set(invoices.map(i => i.recipient.name)).size}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-red-50 p-3 rounded-full text-red-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-slate-500 font-bold text-sm">Total Outstanding</span>
                    </div>
                    <h3 className="text-3xl font-black text-red-600">
                        {totalOutstanding.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </h3>
                </div>
            </div>

            {/* Client Payment Status */}
            {clientDebtsArray.length > 0 && (
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Client Payment Status
                        </h3>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Client Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Invoice Status</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Paid Amount</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Outstanding Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clientDebtsArray.slice(0, 5).map((client, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800">{client.clientName}</td>
                                        <td className="p-4 text-center">
                                            {client.count > 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                                    {client.count} invoice{client.count !== 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                    Fully Paid
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-green-600 text-right">
                                            {client.paid.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </td>
                                        <td className={`p-4 font-black text-right text-lg ${client.total > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            {client.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recent Invoices */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <FileText size={18} className="text-slate-500" /> Recent Invoices
                    </h3>
                    <button onClick={() => navigate('/invoices')} className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1">
                        View All <ArrowUpRight size={14} />
                    </button>
                </div>

                {recentInvoices.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No invoices yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Invoice #</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Client</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentInvoices.map(inv => (
                                    <tr key={inv.id} onClick={() => navigate(`/edit/${inv.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800">{inv.number}</td>
                                        <td className="p-4 font-medium text-slate-600">{inv.recipient.name}</td>
                                        <td className="p-4 text-sm text-slate-500">{inv.date}</td>
                                        <td className="p-4 font-bold text-slate-800 text-right">
                                            {calculateInvoiceTotals(inv).total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
