import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Printer, Trash2, Plus, FileText, CheckCircle, XCircle } from 'lucide-react';
import { getAllInvoices, deleteInvoice, saveInvoice } from '../services/invoiceService';
import { getInvoiceTotal, calculateInvoiceTotals } from '../utils/invoiceCalculations';

export default function Invoices() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState(() => getAllInvoices());
    const [searchTerm, setSearchTerm] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const loadInvoices = useCallback(() => {
        setInvoices(getAllInvoices());
    }, []);

    const handleDelete = (id, e) => {
        e.stopPropagation();
        e.preventDefault();
        setDeleteConfirm(id);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteInvoice(deleteConfirm);
            loadInvoices();
            setDeleteConfirm(null);
        }
    };

    const togglePaymentStatus = (inv, e) => {
        e.stopPropagation();
        e.preventDefault();

        const { total } = calculateInvoiceTotals(inv);

        // Check if currently paid (received >= total)
        const isPaid = (inv.received || 0) >= total;

        const updatedInvoice = {
            ...inv,
            received: isPaid ? 0 : total
        };

        saveInvoice(updatedInvoice);
        loadInvoices();
    };

    const filteredInvoices = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);

        return invoices.filter(inv => {
            const total = getInvoiceTotal(inv);
            const matchesTerm = !term || (
                (inv.recipient?.name || '').toLowerCase().includes(term) ||
                (inv.number || '').toLowerCase().includes(term) ||
                total.toString().includes(term)
            );

            const matchesMin = !isNaN(min) ? total >= min : true;
            const matchesMax = !isNaN(max) ? total <= max : true;

            return matchesTerm && matchesMin && matchesMax;
        });
    }, [invoices, searchTerm, minPrice, maxPrice]);

    return (
        <div className="p-8">
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-800 mb-2" id="delete-modal-title">Delete Invoice?</h3>
                        <p className="text-slate-600 mb-6">Are you sure? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-slate-100 rounded-lg font-bold">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-slate-800">Invoices</h1>
                <div className="flex gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search client, number or amount..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Min Price"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-24 px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                        />
                        <input
                            type="number"
                            placeholder="Max Price"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-24 px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => navigate('/create')}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={18} /> New Invoice
                    </button>
                </div>
            </div>

            {filteredInvoices.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Invoices Found</h3>
                    <p className="text-slate-500">Try adjusting your search or create a new one.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInvoices.map((inv) => {
                        const total = getInvoiceTotal(inv);
                        const isPaid = (inv.received || 0) >= total;

                        return (
                            <div
                                key={inv.id}
                                onClick={() => navigate(`/edit/${inv.id}`)}
                                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">Invoice {inv.number}</h4>
                                        <p className="text-xs text-slate-500 font-medium">{inv.recipient.name || 'Untitled Client'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">
                                            {inv.date}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {isPaid ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 my-3 pt-3 flex justify-between items-end">
                                    <div>
                                        <span className="text-xs text-slate-400 font-bold uppercase block">Total Amount</span>
                                        <span className="text-xl font-black text-slate-900">
                                            {total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => togglePaymentStatus(inv, e)}
                                            className={`p-2 rounded-lg transition-colors ${isPaid
                                                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                                : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                }`}
                                            title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                                        >
                                            {isPaid ? <CheckCircle size={18} /> : <CheckCircle size={18} />}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                navigate(`/preview/${inv.id}`);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Print / Preview"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(inv.id, e)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
