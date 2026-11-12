import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Search, Edit2, Trash2, X, Save, Mail, Phone, MapPin, FileText, Download, Upload } from 'lucide-react';
import { getAllClients, saveClient, deleteClient, createEmptyClient, exportClientsToJSON, importClientsFromJSON } from '../services/clientService';
import { getSettings } from '../services/settingsService';
import { validateGST, validateEmail, validatePhone } from '../utils/validation';
import { useToast } from '../components/Toast';

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState(createEmptyClient());
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = () => {
        const allClients = getAllClients();
        setClients(allClients);
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.mobile.includes(searchQuery) ||
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData(client);
        } else {
            setEditingClient(null);
            setFormData(createEmptyClient());
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        setFormData(createEmptyClient());
    };

    const handleSave = () => {
        const settings = getSettings();
        if (!formData.name.trim()) {
            addToast('Name is required!', 'error');
            return;
        }

        if (settings.validation.requireClientMobile && !formData.mobile.trim()) {
            addToast('Mobile number is required (as per Settings)!', 'error');
            return;
        }

        if (formData.mobile && !validatePhone(formData.mobile)) {
            addToast('Please enter a valid mobile number.', 'error');
            return;
        }

        if (formData.email && !validateEmail(formData.email)) {
            addToast('Please enter a valid email address.', 'error');
            return;
        }

        if (formData.gstNumber && !validateGST(formData.gstNumber)) {
            addToast('Invalid GST Number format!', 'error');
            return;
        }

        saveClient(formData);
        loadClients();
        handleCloseModal();
        addToast(editingClient ? 'Client updated successfully!' : 'Client created successfully!', 'success');
    };

    const handleDelete = (id) => {
        setDeleteConfirm(id);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteClient(deleteConfirm);
            loadClients();
            setDeleteConfirm(null);
        }
    };

    const handleChange = (field, value) => {
        // Validate mobile number to only accept digits
        if (field === 'mobile') {
            // Remove any non-digit characters
            value = value.replace(/\D/g, '');
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleExport = () => {
        try {
            exportClientsToJSON();
            addToast('Clients exported successfully!', 'success');
        } catch (error) {
            addToast('Failed to export clients', 'error');
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
            const result = importClientsFromJSON(text);
            loadClients();
            addToast(`Successfully imported ${result.count} client(s)!`, 'success');
        } catch (error) {
            addToast(error.message || 'Failed to import clients', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Client?</h3>
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
                        <Users className="text-blue-600" size={36} />
                        Clients
                    </h1>
                    <p className="text-slate-600 text-lg">Manage your client database</p>
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
                                placeholder="Search clients by name, mobile, or email..."
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
                                Create Client
                            </button>
                        </div>
                    </div>
                </div>

                {/* Clients Grid */}
                {filteredClients.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 text-center">
                        <Users className="mx-auto text-slate-300 mb-4" size={64} />
                        <h3 className="text-xl font-bold text-slate-600 mb-2">
                            {searchQuery ? 'No clients found' : 'No clients yet'}
                        </h3>
                        <p className="text-slate-500 mb-6">
                            {searchQuery ? 'Try a different search term' : 'Create your first client to get started'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
                            >
                                <Plus size={20} />
                                Create Your First Client
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClients.map(client => (
                            <div
                                key={client.id}
                                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{client.name}</h3>
                                        {client.mobile && (
                                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                <Phone size={14} />
                                                {client.mobile}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {client.email && (
                                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                                        <Mail size={14} />
                                        {client.email}
                                    </div>
                                )}

                                {client.gstNumber && (
                                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                                        <FileText size={14} />
                                        GST: {client.gstNumber}
                                    </div>
                                )}

                                {client.address && (
                                    <div className="flex items-start gap-2 text-slate-600 text-sm mt-3 pt-3 border-t border-slate-100">
                                        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">{client.address}</span>
                                    </div>
                                )}
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
                                    {editingClient ? 'Edit Client' : 'Create New Client'}
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
                                        Client Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        placeholder="Enter client or company name"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                </div>

                                {/* Mobile */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.mobile}
                                        onChange={(e) => handleChange('mobile', e.target.value)}
                                        placeholder="Enter mobile number"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        placeholder="Enter email address (optional)"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                </div>

                                {/* GST Number */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.gstNumber}
                                        onChange={(e) => handleChange('gstNumber', e.target.value)}
                                        placeholder="Enter GST number (optional)"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        placeholder="Enter full address (optional)"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
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
                                    {editingClient ? 'Update Client' : 'Create Client'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
