import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Layout,
    Users,
    X,
    Save,
    Search,
    Check,
    Phone,
    Mail,
    MapPin,
    Building2,
    FileText,
    ArrowRight,
    RotateCcw
} from 'lucide-react';
import { TEMPLATES } from '../utils/templates';
import { getAllClients, saveClient, createEmptyClient } from '../services/clientService';
import { getSettings } from '../services/settingsService';
import { validateGST, validateEmail, validatePhone } from '../utils/validation';
import { filterClients, getInitials, getClientAvatarStyle } from '../utils/clientHelpers';
import { useToast } from '../components/Toast';

export default function CreateInvoice() {
    const navigate = useNavigate();
    const [selectedClient, setSelectedClient] = useState('');
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
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

    // Filter clients dynamically by name, mobile, email, GST, or address
    const filteredClients = useMemo(() => {
        return filterClients(clients, searchQuery);
    }, [clients, searchQuery]);

    const handleSelectClient = (clientId) => {
        const strId = clientId.toString();
        // Toggle selection: if already selected, clicking again deselects
        if (selectedClient === strId) {
            setSelectedClient('');
        } else {
            setSelectedClient(strId);
        }
    };

    const handleClearSelection = () => {
        setSelectedClient('');
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

    const handleOpenModal = (prefilledName = '') => {
        setFormData({
            ...createEmptyClient(),
            name: typeof prefilledName === 'string' ? prefilledName : ''
        });
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

        const saved = saveClient(formData);
        loadClients();
        setSelectedClient(saved.id.toString());
        setSearchQuery('');
        handleCloseModal();
        addToast(`Client "${saved.name}" created and selected!`, 'success');
    };

    const handleChange = (field, value) => {
        if (field === 'mobile') {
            value = value.replace(/\D/g, '');
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const selectedClientData = clients.find(c => c.id.toString() === selectedClient);

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                    <span>Invoice Workflow</span>
                    <span>•</span>
                    <span>New Invoice Setup</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Create New Invoice</h1>
                <p className="text-slate-500 mt-1 text-base">Select a client and choose a visual template to launch the invoice editor.</p>
            </div>

            {/* STEP 1: Client Selection Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7 mb-8 transition-all">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs">
                                1
                            </span>
                            <h2 className="text-xl font-bold text-slate-900">Select Client</h2>
                        </div>
                        <p className="text-sm text-slate-500">
                            Choose an existing client to pre-fill their billing information, or create a new one.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm hover:shadow transition-all whitespace-nowrap self-start sm:self-auto"
                    >
                        <Plus size={18} />
                        Add New Client
                    </button>
                </div>

                {/* Active Selection Summary Banner */}
                {selectedClientData && (
                    <div className="mt-5 p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                                <Check size={18} strokeWidth={3} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Client Selected</span>
                                    <span className="font-bold text-slate-900 text-base">{selectedClientData.name}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-0.5">
                                    {selectedClientData.mobile && <span>Ph: {selectedClientData.mobile}</span>}
                                    {selectedClientData.email && <span>Email: {selectedClientData.email}</span>}
                                    {selectedClientData.gstNumber && <span className="font-mono">GST: {selectedClientData.gstNumber}</span>}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleClearSelection}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors whitespace-nowrap self-start sm:self-auto"
                            title="Clear client selection to invoice as a walk-in client"
                        >
                            <RotateCcw size={14} />
                            Change / Deselect
                        </button>
                    </div>
                )}

                {/* Search Bar & Counter */}
                <div className="mt-6">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search clients by name, phone, email, location, or GST..."
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {clients.length > 0 && (
                            <div className="text-xs font-medium text-slate-500 px-1 whitespace-nowrap">
                                {searchQuery ? (
                                    <span>Found <strong>{filteredClients.length}</strong> of {clients.length} clients</span>
                                ) : (
                                    <span>Total <strong>{clients.length}</strong> clients available</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Client Card Grid / Empty States */}
                <div className="mt-5">
                    {clients.length === 0 ? (
                        /* Zero Clients in Database */
                        <div className="py-12 px-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <Users size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">No clients saved yet</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
                                Add your clients once to automatically pre-fill their billing address, phone, and GST details in future invoices.
                            </p>
                            <button
                                type="button"
                                onClick={() => handleOpenModal()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm transition-all"
                            >
                                <Plus size={18} />
                                Create Your First Client
                            </button>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        /* Search yielded no matches */
                        <div className="py-10 px-6 border border-slate-200 rounded-xl text-center bg-slate-50/50">
                            <Search className="mx-auto text-slate-300 mb-2" size={36} />
                            <h3 className="text-base font-bold text-slate-700 mb-1">No clients match "{searchQuery}"</h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Double check your search term or quickly create a new client with this name.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Clear Search
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOpenModal(searchQuery)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                                >
                                    <Plus size={14} />
                                    Add New Client "{searchQuery}"
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Responsive Client Card Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredClients.map(client => {
                                const isSelected = selectedClient === client.id.toString();
                                const avatarColor = getClientAvatarStyle(client.name, client.id);
                                const initials = getInitials(client.name);

                                return (
                                    <div
                                        key={client.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={isSelected}
                                        onClick={() => handleSelectClient(client.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleSelectClient(client.id);
                                            }
                                        }}
                                        className={`group relative text-left p-4 sm:p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                            isSelected
                                                ? 'border-2 border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                                                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {/* Top Header: Avatar + Name + Check Indicator */}
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${avatarColor}`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={`font-bold text-base truncate transition-colors ${
                                                            isSelected ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-600'
                                                        }`}>
                                                            {client.name}
                                                        </h4>
                                                        {client.gstNumber && (
                                                            <span className="inline-block text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                                                                GST: {client.gstNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Selection Checkbox/Radio Icon */}
                                                <div className="shrink-0 mt-0.5">
                                                    {isSelected ? (
                                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                                            <Check size={14} strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-blue-400 transition-colors" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Secondary Metadata: Phone, Email, Location */}
                                            <div className="space-y-1.5 pt-2 border-t border-slate-100/80 text-xs text-slate-600">
                                                {client.mobile ? (
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Phone size={13} className="text-slate-400 shrink-0" />
                                                        <span className="font-medium text-slate-700">{client.mobile}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-400 italic">
                                                        <Phone size={13} className="shrink-0" />
                                                        <span>No phone provided</span>
                                                    </div>
                                                )}

                                                {client.email && (
                                                    <div className="flex items-center gap-2 truncate" title={client.email}>
                                                        <Mail size={13} className="text-slate-400 shrink-0" />
                                                        <span className="truncate">{client.email}</span>
                                                    </div>
                                                )}

                                                {client.address && (
                                                    <div className="flex items-center gap-2 truncate" title={client.address}>
                                                        <MapPin size={13} className="text-slate-400 shrink-0" />
                                                        <span className="truncate">{client.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Click Action Hint */}
                                        <div className="mt-3 pt-2 text-[11px] font-semibold flex items-center justify-between border-t border-slate-100">
                                            <span className={isSelected ? 'text-blue-700 font-bold' : 'text-slate-400 group-hover:text-blue-500 transition-colors'}>
                                                {isSelected ? '✓ Selected' : 'Click to select'}
                                            </span>
                                            {isSelected && (
                                                <span className="text-blue-600 hover:underline text-[10px]">
                                                    Click to deselect
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* STEP 2: Invoice Configuration & GST */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 transition-all">
                <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-white font-bold text-xs">
                        2
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">Tax & Calculation Preferences</h2>
                </div>

                <label className="flex items-center gap-4 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                    <div className="relative shrink-0">
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
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">GST Invoice</span>
                            {isGST && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                    Enabled
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Enable GST/Tax calculations (CGST, SGST, IGST) automatically in this invoice</p>
                    </div>
                </label>
            </section>

            {/* STEP 3: Templates Selection */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-white font-bold text-xs">
                            3
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Layout size={20} className="text-slate-600" />
                            Choose a Template & Launch Editor
                        </h2>
                    </div>

                    {selectedClientData && (
                        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
                            <span>Ready to invoice</span>
                            <span className="font-bold underline">{selectedClientData.name}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => handleCreate(template.id)}
                            className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-500 transition-all group text-left border border-slate-200 relative flex flex-col justify-between"
                        >
                            <div>
                                <div className={`h-28 ${template.previewColor} w-full relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-white opacity-10 rotate-12 scale-150 transform translate-y-8"></div>
                                    <div className="absolute bottom-3 right-3 bg-white/20 p-2 rounded-lg backdrop-blur-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Plus size={18} className="text-white" />
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">{template.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                                </div>
                            </div>

                            <div className="px-4 pb-3 pt-0 flex items-center justify-between text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>Use Template</span>
                                <ArrowRight size={14} />
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Create Client Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl z-10">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Users size={24} className="text-blue-600" />
                                Create New Client
                            </h2>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Client / Company Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="e.g. Acme Corporation or John Doe"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-900"
                                />
                            </div>

                            {/* Mobile */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Mobile Number {getSettings().validation.requireClientMobile && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={(e) => handleChange('mobile', e.target.value)}
                                    placeholder="e.g. 9876543210 (digits only)"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-900"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="e.g. billing@company.com"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-900"
                                />
                            </div>

                            {/* GST Number */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    GST Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.gstNumber}
                                    onChange={(e) => handleChange('gstNumber', e.target.value.toUpperCase())}
                                    placeholder="e.g. 27AAAAA0000A1Z5"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-900 uppercase font-mono"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Billing Address
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="Enter street, city, state, and postal code"
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none font-medium text-slate-900"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-5 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 text-slate-700 font-semibold hover:bg-slate-200 rounded-xl transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveClient}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all text-sm"
                            >
                                <Save size={18} />
                                Save & Select Client
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
