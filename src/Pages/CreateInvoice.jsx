import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layout, Users, X, Save } from 'lucide-react';
import { TEMPLATES } from '../utils/templates';
import { getAllClients, saveClient, createEmptyClient } from '../services/clientService';
import { getSettings } from '../services/settingsService';
import { useToast } from '../components/Toast';


export default function CreateInvoice() {
    const navigate = useNavigate();
    const [selectedClient, setSelectedClient] = useState('');
    const [clients, setClients] = useState([]);
    const [isGST, setIsGST] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(createEmptyClient());
    const { addToast } = useToast();


    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = () => {
        const allClients = getAllClients();
        setClients(allClients);
    };

    const handleCreate = (templateId) => {
        const params = new URLSearchParams();
        params.set('template', templateId);
        if (selectedClient) {
            params.set('clientId', selectedClient);
        }
        if (isGST) {
            params.set('gst', 'true');
        }
        navigate(`/editor/new?${params.toString()}`);
    };

    const handleOpenModal = () => {
        setFormData(createEmptyClient());
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(createEmptyClient());
    };

    const handleSaveClient = () => {
        const settings = getSettings();
        if (!formData.name.trim()) {
            addToast('Client Name is required!', 'error');
            return;
        }

        if (settings.validation.requireClientMobile && !formData.mobile.trim()) {
            addToast('Mobile Number is required (as per Settings)!', 'error');
            return;
        }


        const saved = saveClient(formData);
        loadClients();
        setSelectedClient(saved.id.toString());
        handleCloseModal();
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const selectedClientData = clients.find(c => c.id.toString() === selectedClient);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Create New Invoice</h1>
            <p className="text-slate-500 mb-8">Select a client and choose a template to get started.</p>

            {/* Client Selection */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Client</label>
                <div className="flex gap-3">
                    <select
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="flex-1 text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    >
                        <option value="">-- Select a client --</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.name} - {client.mobile}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                    >
                        <Plus size={20} />
                        Create Client
                    </button>
                </div>

                {/* Selected Client Info */}
                {selectedClientData && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <h3 className="font-bold text-blue-900 mb-2">Selected Client:</h3>
                        <div className="text-sm text-blue-800 space-y-1">
                            <p><strong>Name:</strong> {selectedClientData.name}</p>
                            <p><strong>Mobile:</strong> {selectedClientData.mobile}</p>
                            {selectedClientData.email && <p><strong>Email:</strong> {selectedClientData.email}</p>}
                            {selectedClientData.gstNumber && <p><strong>GST:</strong> {selectedClientData.gstNumber}</p>}
                        </div>
                    </div>
                )}

                <p className="text-xs text-slate-400 mt-3">
                    {clients.length === 0 ? (
                        <>No clients found. Click "Create Client" to add your first client.</>
                    ) : (
                        <>Select an existing client or create a new one to pre-fill invoice details.</>
                    )}
                </p>
            </div>

            {/* GST Toggle */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-10">
                <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={isGST}
                            onChange={(e) => setIsGST(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                        <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-7 shadow-sm"></div>
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-700">GST Invoice</span>
                        <p className="text-xs text-slate-400">Enable to add GST/Tax calculations to this invoice</p>
                    </div>
                </label>
            </div>

            {/* Templates */}
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Layout size={18} className="text-slate-500" /> Choose a Template
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TEMPLATES.map(template => (
                    <button
                        key={template.id}
                        onClick={() => handleCreate(template.id)}
                        className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-500 transition-all group text-left border border-slate-200 relative"
                    >
                        <div className={`h-32 ${template.previewColor} w-full relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-white opacity-10 rotate-12 scale-150 transform translate-y-8"></div>
                            <div className="absolute bottom-3 right-3 bg-white/20 p-2 rounded-lg backdrop-blur-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Plus size={20} className="text-white" />
                            </div>
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{template.name}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Create Client Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Users size={24} className="text-blue-600" />
                                Create New Client
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
                                    Mobile Number {getSettings().validation.requireClientMobile && <span className="text-red-500">*</span>}
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
                                onClick={handleSaveClient}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                            >
                                <Save size={18} />
                                Create Client
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
