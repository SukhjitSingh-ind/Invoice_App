import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X, Save, DollarSign, Hash, Tag, Download, Upload, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllItems, saveItem, deleteItem, createEmptyItem, exportItemsToJSON, importItemsFromJSON } from '../services/itemService';
import { useToast } from '../components/Toast';

export default function Items() {
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState(createEmptyItem());
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [viewingHistoryItem, setViewingHistoryItem] = useState(null);
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = () => {
        const allItems = getAllItems();
        setItems(allItems);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);
        } else {
            setEditingItem(null);
            setFormData(createEmptyItem());
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData(createEmptyItem());
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            addToast('Item name is required!', 'error');
            return;
        }

        if (!formData.defaultPrice || formData.defaultPrice <= 0) {
            addToast('Default price must be greater than zero!', 'error');
            return;
        }

        saveItem(formData);
        loadItems();
        handleCloseModal();
        addToast(editingItem ? 'Item updated successfully!' : 'Item created successfully!', 'success');
    };

    const handleDelete = (id) => {
        setDeleteConfirm(id);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteItem(deleteConfirm);
            loadItems();
            setDeleteConfirm(null);
            addToast('Item deleted successfully!', 'success');
        }
    };

    const handleChange = (field, value) => {
        // Validate numeric fields
        if (field === 'defaultPrice' || field === 'gstRate') {
            value = value === '' ? 0 : parseFloat(value);
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleExport = () => {
        try {
            exportItemsToJSON();
            addToast('Items exported successfully!', 'success');
        } catch (error) {
            addToast('Failed to export items', 'error');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset the input value so the same file can be selected again
        event.target.value = '';

        try {
            const text = await file.text();
            const result = importItemsFromJSON(text);
            loadItems();
            addToast(`Successfully imported ${result.count} item(s)!`, 'success');
        } catch (error) {
            addToast(error.message || 'Failed to import items', 'error');
        }
    };

    const handleViewHistory = (item) => {
        setViewingHistoryItem(item);
        setHistoryModalOpen(true);
    };

    const getHistoryStats = (history) => {
        if (!history || history.length === 0) return null;

        const prices = history.map(h => h.price);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);

        const maxDate = new Date(history.find(h => h.price === maxPrice).date).toLocaleDateString();
        const minDate = new Date(history.find(h => h.price === minPrice).date).toLocaleDateString();

        return { maxPrice, minPrice, maxDate, minDate };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Item?</h3>
                            <p className="text-slate-600 mb-6">Are you sure? This cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-slate-100 rounded-lg font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">Delete</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
                        <Package className="text-blue-600" size={36} />
                        Items
                    </h1>
                    <p className="text-slate-600 text-lg">Manage your product and service library</p>
                </div>

                {/* Search & Create */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search items by name or description..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 whitespace-nowrap"
                            >
                                <Download size={20} />
                                Export
                            </button>
                            <button
                                onClick={handleImportClick}
                                className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 whitespace-nowrap"
                            >
                                <Upload size={20} />
                                Import
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 whitespace-nowrap"
                            >
                                <Plus size={20} />
                                Create Item
                            </button>
                        </div>
                    </div>
                </div>

                {/* Items Grid */}
                {filteredItems.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 text-center">
                        <Package className="mx-auto text-slate-300 mb-4" size={64} />
                        <h3 className="text-xl font-bold text-slate-600 mb-2">
                            {searchQuery ? 'No items found' : 'No items yet'}
                        </h3>
                        <p className="text-slate-500 mb-6">
                            {searchQuery ? 'Try a different search term' : 'Create your first item to get started'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
                            >
                                <Plus size={20} />
                                Create Your First Item
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{item.name}</h3>
                                        {item.description && (
                                            <p className="text-slate-600 text-sm line-clamp-2 mb-2">{item.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleViewHistory(item); }}
                                            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                            title="View Price History"
                                        >
                                            <TrendingUp size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <DollarSign size={14} />
                                            Default Price
                                        </span>
                                        <span className="font-bold text-slate-900">₹{item.defaultPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {item.hsnSac && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 flex items-center gap-1">
                                                <Hash size={14} />
                                                HSN/SAC
                                            </span>
                                            <span className="font-medium text-slate-700">{item.hsnSac}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <Tag size={14} />
                                            Unit
                                        </span>
                                        <span className="font-medium text-slate-700">{item.unit}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">GST Rate</span>
                                        <span className="font-medium text-slate-700">{item.gstRate}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl">
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {editingItem ? 'Edit Item' : 'Create New Item'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Item Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        placeholder="Enter item or service name"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Enter item description (optional)"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                                    />
                                </div>

                                {/* Default Price */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Default Price <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.defaultPrice}
                                        onChange={(e) => handleChange('defaultPrice', e.target.value)}
                                        placeholder="Enter default price"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* HSN/SAC */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            HSN/SAC Code
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.hsnSac}
                                            onChange={(e) => handleChange('hsnSac', e.target.value)}
                                            placeholder="HSN/SAC (optional)"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                        />
                                    </div>

                                    {/* Unit */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Unit
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.unit}
                                            onChange={(e) => handleChange('unit', e.target.value)}
                                            placeholder="Unit (e.g., Pcs, Kg)"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* GST Rate */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        GST Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={formData.gstRate}
                                        onChange={(e) => handleChange('gstRate', e.target.value)}
                                        placeholder="GST rate percentage"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 text-slate-700 font-semibold hover:bg-slate-200 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                                >
                                    <Save size={18} />
                                    {editingItem ? 'Update Item' : 'Create Item'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {historyModalOpen && viewingHistoryItem && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                        <TrendingUp className="text-indigo-600" />
                                        Price History
                                    </h2>
                                    <p className="text-slate-500">{viewingHistoryItem.name}</p>
                                </div>
                                <button
                                    onClick={() => setHistoryModalOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6">
                                {viewingHistoryItem.priceHistory && viewingHistoryItem.priceHistory.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                                <p className="text-emerald-600 text-sm font-bold uppercase mb-1">Highest Price</p>
                                                <p className="text-2xl font-black text-emerald-700">
                                                    ₹{getHistoryStats(viewingHistoryItem.priceHistory).maxPrice.toLocaleString('en-IN')}
                                                </p>
                                                <p className="text-emerald-600 text-xs mt-1">
                                                    on {getHistoryStats(viewingHistoryItem.priceHistory).maxDate}
                                                </p>
                                            </div>
                                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                                <p className="text-red-600 text-sm font-bold uppercase mb-1">Lowest Price</p>
                                                <p className="text-2xl font-black text-red-700">
                                                    ₹{getHistoryStats(viewingHistoryItem.priceHistory).minPrice.toLocaleString('en-IN')}
                                                </p>
                                                <p className="text-red-600 text-xs mt-1">
                                                    on {getHistoryStats(viewingHistoryItem.priceHistory).minDate}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="h-80 w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={viewingHistoryItem.priceHistory}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={(date) => new Date(date).toLocaleDateString()}
                                                        stroke="#64748b"
                                                        fontSize={12}
                                                    />
                                                    <YAxis
                                                        stroke="#64748b"
                                                        fontSize={12}
                                                        tickFormatter={(value) => `₹${value}`}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                                        formatter={(value) => [`₹${value}`, 'Price']}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="price"
                                                        stroke="#4f46e5"
                                                        strokeWidth={3}
                                                        dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-slate-500">
                                        <TrendingUp className="mx-auto text-slate-300 mb-3" size={48} />
                                        <p>No price history available for this item.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
