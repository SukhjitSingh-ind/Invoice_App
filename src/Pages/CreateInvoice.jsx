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
    FileText,
    ArrowRight,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { TEMPLATES } from '../utils/templates';
import { getAllClients, saveClient, createEmptyClient } from '../services/clientService';
import { getSettings } from '../services/settingsService';
import { validateGST, validateEmail, validatePhone } from '../utils/validation';
import {
    filterClients,
    getInitials,
    getClientAvatarStyle,
    paginateClients,
    getPageNumbers,
    CLIENTS_PER_PAGE
} from '../utils/clientHelpers';
import { useToast } from '../components/Toast';

export default function CreateInvoice() {
    const navigate = useNavigate();
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isGST, setIsGST] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(createEmptyClient());
    const { addToast } = useToast();

    useEffect(() => {
        loadClients();
    }, []);

    // Automatically reset pagination to page 1 whenever search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const loadClients = () => {
        const allClients = getAllClients();
        setClients(allClients);
    };

    // Filter clients dynamically across all records by name, mobile, email, GST, or address
    const filteredClients = useMemo(() => {
        return filterClients(clients, searchQuery);
    }, [clients, searchQuery]);

    // Paginate the filtered client records (10 per page default)
    const paginationData = useMemo(() => {
        return paginateClients(filteredClients, currentPage, CLIENTS_PER_PAGE);
    }, [filteredClients, currentPage]);

    const {
        items: paginatedClients,
        page,
        totalPages,
        totalItems,
        startIndex,
        endIndex,
        hasNextPage,
        hasPrevPage
    } = paginationData;

    const pageNumbers = useMemo(() => {
        return getPageNumbers(page, totalPages);
    }, [page, totalPages]);

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
        const activeTemplate = templateId || selectedTemplate;
        if (!activeTemplate) {
            addToast('Please select an invoice template to continue!', 'error');
            return;
        }

        const params = new URLSearchParams();
        params.set('template', activeTemplate);
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
        setCurrentPage(1);
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
    const selectedTemplateData = TEMPLATES.find(t => t.id === selectedTemplate);

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto pb-16">
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                    <span>Invoice Workflow</span>
                    <span>•</span>
                    <span>New Invoice Setup</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Create New Invoice</h1>
                <p className="text-slate-500 mt-1 text-base">Select a client and choose an invoice template to launch the editor.</p>
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
                            Choose an existing client from your directory or create a new one to pre-fill billing details.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm hover:shadow transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
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
                                placeholder="Search clients across entire directory by name, phone, email, location, or GST..."
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
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
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                            >
                                <Plus size={18} />
                                Create Your First Client
                            </button>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        /* Search yielded no matches across entire directory */
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
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Clear Search
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOpenModal(searchQuery)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all cursor-pointer"
                                >
                                    <Plus size={14} />
                                    Add New Client "{searchQuery}"
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Responsive Client Card Grid (10 per page default) */
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedClients.map(client => {
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

                                                    {/* Selection Indicator Badge */}
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

                            {/* Pagination Controls */}
                            {totalItems > 0 && (
                                <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    {/* Pagination Summary */}
                                    <div className="text-xs sm:text-sm font-medium text-slate-600">
                                        Showing <span className="font-bold text-slate-900">{startIndex + 1}–{endIndex}</span> of <span className="font-bold text-slate-900">{totalItems}</span> {searchQuery ? 'matching clients' : 'clients'}
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="flex items-center gap-1.5">
                                        {/* Previous Button */}
                                        <button
                                            type="button"
                                            disabled={!hasPrevPage}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                                hasPrevPage
                                                    ? 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm cursor-pointer'
                                                    : 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed select-none'
                                            }`}
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft size={15} />
                                            <span>Previous</span>
                                        </button>

                                        {/* Numbered Page Buttons */}
                                        <div className="hidden xs:flex items-center gap-1">
                                            {pageNumbers.map((p, idx) => {
                                                if (p === '...') {
                                                    return (
                                                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-medium select-none">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                const isCurrent = p === page;
                                                return (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={`min-w-8 h-8 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                                                            isCurrent
                                                                ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
                                                                : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                        }`}
                                                        aria-current={isCurrent ? 'page' : undefined}
                                                        aria-label={`Page ${p}`}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Mobile Page Indicator */}
                                        <span className="xs:hidden text-xs font-medium text-slate-600 px-2">
                                            Page {page} of {totalPages}
                                        </span>

                                        {/* Next Button */}
                                        <button
                                            type="button"
                                            disabled={!hasNextPage}
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                                hasNextPage
                                                    ? 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm cursor-pointer'
                                                    : 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed select-none'
                                            }`}
                                            aria-label="Next page"
                                        >
                                            <span>Next</span>
                                            <ChevronRight size={15} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
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

            {/* STEP 3: Templates Selection with Improved Discoverability */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7 mb-8 transition-all">
                {/* Header & Instructions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs">
                                3
                            </span>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Layout size={20} className="text-blue-600" />
                                Choose an Invoice Template
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500">
                            Select a visual design for your invoice. You can customize line items, taxes, notes, and branding in the editor.
                        </p>
                    </div>

                    {selectedTemplateData ? (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold self-start sm:self-auto animate-in fade-in">
                            <Check size={14} strokeWidth={3} />
                            <span>Selected: {selectedTemplateData.name}</span>
                        </div>
                    ) : (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg self-start sm:self-auto flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            Template required to proceed
                        </span>
                    )}
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    {TEMPLATES.map(template => {
                        const isSelected = selectedTemplate === template.id;

                        return (
                            <div
                                key={template.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                onClick={() => setSelectedTemplate(template.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedTemplate(template.id);
                                    }
                                }}
                                className={`bg-white rounded-xl overflow-hidden text-left border transition-all cursor-pointer flex flex-col justify-between group relative ${
                                    isSelected
                                        ? 'border-2 border-blue-600 shadow-lg ring-4 ring-blue-500/10 -translate-y-1'
                                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                                }`}
                            >
                                <div>
                                    {/* Preview Banner */}
                                    <div className={`h-28 ${template.previewColor} w-full relative overflow-hidden transition-all`}>
                                        <div className="absolute inset-0 bg-white opacity-10 rotate-12 scale-150 transform translate-y-8"></div>
                                        
                                        {/* Selected Indicator Badge */}
                                        {isSelected ? (
                                            <div className="absolute top-2.5 right-2.5 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-75">
                                                <Check size={16} strokeWidth={3} />
                                            </div>
                                        ) : (
                                            <div className="absolute top-2.5 right-2.5 bg-white/30 backdrop-blur-sm text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus size={14} />
                                            </div>
                                        )}

                                        <div className="absolute bottom-2.5 left-3 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-semibold text-white uppercase tracking-wider">
                                            {template.layout} layout
                                        </div>
                                    </div>

                                    {/* Title and Description */}
                                    <div className="p-4 pb-2">
                                        <h4 className={`font-bold text-sm transition-colors ${
                                            isSelected ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'
                                        }`}>
                                            {template.name}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                            {template.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Explicit Action Button inside Card */}
                                <div className="p-4 pt-2">
                                    {isSelected ? (
                                        <button
                                            type="button"
                                            className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all pointer-events-none"
                                        >
                                            <Check size={14} strokeWidth={3} />
                                            Selected Template
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTemplate(template.id);
                                            }}
                                            className="w-full py-2 px-3 rounded-lg bg-slate-50 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-700 border border-slate-200 group-hover:border-blue-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            Choose Template
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Bottom Action Bar: Clear & Obvious Continue Action */}
            <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedTemplate ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                        <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready to Generate</div>
                        <div className="text-sm font-bold text-slate-900 truncate">
                            {selectedTemplateData ? (
                                <span>Template: <strong className="text-blue-700">{selectedTemplateData.name}</strong></span>
                            ) : (
                                <span className="text-slate-500 font-normal">Choose a template above to proceed</span>
                            )}
                            {selectedClientData && (
                                <span className="text-slate-600 font-medium"> • Client: {selectedClientData.name}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/invoices')}
                        className="px-5 py-3 text-slate-600 hover:text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    {selectedTemplate ? (
                        <button
                            type="button"
                            onClick={() => handleCreate(selectedTemplate)}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                        >
                            <span>Continue to Editor</span>
                            <ArrowRight size={18} />
                        </button>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
                                <AlertCircle size={14} className="shrink-0" />
                                Please select a template above to continue
                            </span>
                            <button
                                type="button"
                                disabled
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-400 font-bold text-sm rounded-xl cursor-not-allowed whitespace-nowrap"
                            >
                                <span>Continue to Editor</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700 cursor-pointer"
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
                                className="px-5 py-2.5 text-slate-700 font-semibold hover:bg-slate-200 rounded-xl transition-all text-sm cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveClient}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all text-sm cursor-pointer"
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
