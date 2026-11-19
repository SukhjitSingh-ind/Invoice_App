import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    FileCode2,
    Upload,
    Copy,
    RotateCcw,
    Sparkles,
    Check,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Users,
    Layout,
    Search,
    X,
    Phone,
    Mail,
    Plus,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    FileSpreadsheet,
    DollarSign,
    Calendar,
    Hash,
    Building2,
    Eye,
    Code2,
    RefreshCw
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { TEMPLATES, getTemplateById, formatCustomTemplateForPicker } from '../utils/templates.js';
import { saveClient, createEmptyClient } from '../services/clientService.js';
import { getSettings, getActiveProfile } from '../services/settingsService.js';
import { getNextInvoiceNumber } from '../services/invoiceService.js';
import { validateGST, validateEmail, validatePhone } from '../utils/validation.ts';
import {
    filterClients,
    getInitials,
    getClientAvatarStyle,
    paginateClients,
    getPageNumbers
} from '../utils/clientHelpers.js';
import {
    parseAndValidateInvoiceJson,
    resolveInvoiceData,
    getSampleInvoiceJson
} from '../utils/jsonInvoiceParser.js';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations.js';
import { useToast } from '../components/Toast.jsx';
import {
    ROUTES,
    STORAGE_KEYS,
    DEFAULT_LOCALE,
    DEFAULT_INITIAL_INVOICE_NUMBER,
    PAGINATION,
    CLIENTS_PER_PAGE,
    DEFAULT_GST_RATE,
    DEFAULT_DISCOUNT_LABEL,
    MONEY_DECIMAL_PRECISION,
    TOAST_TYPES
} from '../constants/index.js';

export default function CreateInvoiceFromJson() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    // Raw JSON input state
    const [jsonInput, setJsonInput] = useState('');
    const [copied, setCopied] = useState(false);

    // Client selection state
    const liveClients = useLiveQuery(() => db.clients.toArray(), []);
    const clients = useMemo(() => liveClients || [], [liveClients]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(PAGINATION.DEFAULT_PAGE);

    // Add Client Modal state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientFormData, setClientFormData] = useState(createEmptyClient());

    // Template manual override state (null or empty string means not manually overridden)
    const [manualTemplateId, setManualTemplateId] = useState('');

    const liveTemplates = useLiveQuery(() => db.templates.toArray(), []);
    const customTemplates = useMemo(() => (liveTemplates || []).filter(t => !t.isBuiltIn), [liveTemplates]);
    const allSelectableTemplates = useMemo(() => {
        const custom = customTemplates.map(formatCustomTemplateForPicker).filter(Boolean);
        return [...custom, ...TEMPLATES];
    }, [customTemplates]);

    // GST manual override state (null = use JSON/default; boolean = explicit user toggle)
    const [manualIsGST, setManualIsGST] = useState(null);

    // Active company profile & settings
    const activeProfile = useMemo(() => getActiveProfile(), []);
    const [nextInvoiceNumber, setNextInvoiceNumber] = useState(DEFAULT_INITIAL_INVOICE_NUMBER);

    useEffect(() => {
        getNextInvoiceNumber().then(num => setNextInvoiceNumber(num));
    }, []);

    // 1. Live Parse & Validate JSON
    const parseResult = useMemo(() => {
        if (!jsonInput.trim()) {
            return {
                success: false,
                rawParsed: null,
                extractedInvoice: null,
                hasClient: false,
                hasTemplate: false,
                errors: [],
                warnings: []
            };
        }
        return parseAndValidateInvoiceJson(jsonInput);
    }, [jsonInput]);

    // 2. Resolve selected manual client object
    const manualClient = useMemo(() => {
        if (!selectedClientId) return null;
        return clients.find((c) => c.id.toString() === selectedClientId) || null;
    }, [clients, selectedClientId]);

    // 3. Resolve Effective Invoice Data with Deterministic Precedence Rules
    const resolvedData = useMemo(() => {
        return resolveInvoiceData({
            extractedData: parseResult.extractedInvoice,
            manualClient,
            manualTemplateId: manualTemplateId || null,
            manualIsGST,
            defaultTemplateId: 'default',
            senderProfile: activeProfile,
            nextInvoiceNumberFallback: nextInvoiceNumber,
            availableTemplates: allSelectableTemplates
        });
    }, [parseResult.extractedInvoice, manualClient, manualTemplateId, manualIsGST, activeProfile, nextInvoiceNumber, allSelectableTemplates]);

    // 4. Calculate Live Totals for Summary Preview
    const invoiceTotals = useMemo(() => {
        return calculateInvoiceTotals(resolvedData.invoice);
    }, [resolvedData.invoice]);

    // Filter & Paginate Clients
    const filteredClients = useMemo(() => {
        return filterClients(clients, searchQuery);
    }, [clients, searchQuery]);

    const paginationData = useMemo(() => {
        return paginateClients(filteredClients, currentPage, CLIENTS_PER_PAGE);
    }, [filteredClients, currentPage]);

    const {
        items: paginatedClients,
        page,
        totalPages,
        hasNextPage,
        hasPrevPage
    } = paginationData;

    const pageNumbers = useMemo(() => {
        return getPageNumbers(page, totalPages);
    }, [page, totalPages]);

    // Handlers
    const handleLoadSample = () => {
        const sample = getSampleInvoiceJson();
        setJsonInput(sample);
        addToast('Sample invoice JSON loaded!', TOAST_TYPES.SUCCESS);
    };

    const handleClearJson = () => {
        setJsonInput('');
        setManualIsGST(null);
        addToast('JSON editor cleared.', TOAST_TYPES.INFO);
    };

    const handleFormatJson = () => {
        if (!jsonInput.trim()) return;
        try {
            const parsed = JSON.parse(jsonInput);
            setJsonInput(JSON.stringify(parsed, null, 2));
            addToast('JSON formatted with clean indentation.', TOAST_TYPES.SUCCESS);
        } catch {
            addToast('Cannot format invalid JSON. Please fix syntax errors first.', TOAST_TYPES.ERROR);
        }
    };

    const handleCopyJson = () => {
        if (!jsonInput) return;
        navigator.clipboard.writeText(jsonInput).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            addToast('JSON copied to clipboard!', TOAST_TYPES.SUCCESS);
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.json')) {
            addToast('Please select a valid .json file.', TOAST_TYPES.ERROR);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                setJsonInput(content);
                addToast(`Loaded ${file.name} successfully!`, TOAST_TYPES.SUCCESS);
            }
        };
        reader.onerror = () => {
            addToast('Failed to read the selected file.', TOAST_TYPES.ERROR);
        };
        reader.readAsText(file);

        // Reset file input so user can re-upload same file if desired
        e.target.value = '';
    };

    const handleSelectClient = (clientId) => {
        const strId = clientId.toString();
        if (selectedClientId === strId) {
            setSelectedClientId('');
            addToast('Client selection cleared.', TOAST_TYPES.INFO);
        } else {
            setSelectedClientId(strId);
            addToast('Client selected (takes precedence over JSON).', TOAST_TYPES.SUCCESS);
        }
    };

    const handleSelectTemplate = (templateId) => {
        if (manualTemplateId === templateId) {
            setManualTemplateId('');
            addToast('Manual template selection cleared. Reverted to JSON/default.', TOAST_TYPES.INFO);
        } else {
            setManualTemplateId(templateId);
            const templateObj = allSelectableTemplates.find(t => String(t.id) === String(templateId)) || getTemplateById(templateId, allSelectableTemplates);
            addToast(`Template "${templateObj.name}" selected.`, TOAST_TYPES.SUCCESS);
        }
    };

    const handleSaveClientModal = async () => {
        const settings = getSettings();
        if (!clientFormData.name.trim()) {
            addToast('Client Name is required!', TOAST_TYPES.ERROR);
            return;
        }

        if (settings.validation.requireClientMobile && !clientFormData.mobile.trim()) {
            addToast('Mobile Number is required (as per Settings)!', TOAST_TYPES.ERROR);
            return;
        }

        if (clientFormData.mobile && !validatePhone(clientFormData.mobile)) {
            addToast('Please enter a valid mobile number.', TOAST_TYPES.ERROR);
            return;
        }

        if (clientFormData.email && !validateEmail(clientFormData.email)) {
            addToast('Please enter a valid email address.', TOAST_TYPES.ERROR);
            return;
        }

        if (clientFormData.gstNumber && !validateGST(clientFormData.gstNumber)) {
            addToast('Invalid GST Number format!', TOAST_TYPES.ERROR);
            return;
        }

        const saved = await saveClient(clientFormData);
        setSelectedClientId(saved.id.toString());
        setSearchQuery('');
        setCurrentPage(PAGINATION.DEFAULT_PAGE);
        setIsClientModalOpen(false);
        setClientFormData(createEmptyClient());
        addToast(`Client "${saved.name}" created and selected!`, TOAST_TYPES.SUCCESS);
    };

    const handleProceedToEditor = () => {
        if (jsonInput.trim() && !parseResult.success) {
            addToast('Please fix JSON syntax errors before proceeding.', TOAST_TYPES.ERROR);
            return;
        }

        const finalInvoice = resolvedData.invoice;

        // Store in sessionStorage as backup for page reload resilience
        try {
            sessionStorage.setItem(STORAGE_KEYS.PENDING_IMPORTED_INVOICE, JSON.stringify(finalInvoice));
        } catch (e) {
            console.error('Session storage write error:', e);
        }

        // Navigate to editor with state
        navigate(ROUTES.EDITOR_NEW, {
            state: {
                importedInvoice: finalInvoice
            }
        });

        addToast('Invoice populated from JSON! You can now review and edit.', TOAST_TYPES.SUCCESS);
    };

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto pb-20">
            {/* Top Breadcrumb & Navigation */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                    <Link to={ROUTES.INVOICES} className="hover:underline">Invoices</Link>
                    <span>•</span>
                    <span>Import JSON Workflow</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl inline-flex">
                                <FileCode2 size={28} />
                            </span>
                            Create Invoice from JSON
                        </h1>
                        <p className="text-slate-500 mt-1 text-base">
                            Paste or upload JSON data to instantly auto-fill an invoice. Customize client or template overrides, review extracted details, and launch the editor.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to={ROUTES.CREATE_INVOICE}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                        >
                            <span>Standard Creation</span>
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* STEP 1: JSON INPUT & FILE UPLOAD */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7 mb-8 transition-all">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
                            1
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Provide Invoice JSON</h2>
                            <p className="text-xs text-slate-500">Paste your invoice JSON or upload a .json file directly from your machine.</p>
                        </div>
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".json,application/json"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                            title="Upload a .json file"
                        >
                            <Upload size={14} />
                            Upload JSON
                        </button>

                        <button
                            type="button"
                            onClick={handleLoadSample}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                            title="Load pre-built sample JSON"
                        >
                            <Sparkles size={14} />
                            Load Example
                        </button>

                        {jsonInput && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleFormatJson}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                    title="Prettify JSON indentation"
                                >
                                    <Code2 size={14} />
                                    Format
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCopyJson}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                    title="Copy JSON to clipboard"
                                >
                                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleClearJson}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                    title="Clear JSON editor"
                                >
                                    <RotateCcw size={14} />
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Editor Container */}
                <div className="mt-4">
                    <div className="relative rounded-xl border border-slate-300 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-slate-900 shadow-inner">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-slate-400">
                            <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                invoice.json
                            </span>
                            <span>{jsonInput ? `${jsonInput.split('\n').length} lines` : 'Empty input'}</span>
                        </div>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='{\n  "invoiceNumber": "INV-2026-001",\n  "issueDate": "2026-11-16",\n  "client": {\n    "name": "Acme Corporation",\n    "email": "billing@acme.com"\n  },\n  "items": [\n    {\n      "description": "Website Development",\n      "quantity": 1,\n      "rate": 25000\n    }\n  ]\n}'
                            rows={12}
                            spellCheck={false}
                            className="w-full p-4 bg-slate-900 text-slate-100 font-mono text-sm leading-relaxed resize-y focus:outline-none placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* Validation Status Badges & Alerts */}
                {jsonInput.trim() && (
                    <div className="mt-4 space-y-2">
                        {parseResult.success ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    <span className="font-bold">Valid JSON structure detected.</span>
                                    <span className="text-emerald-600">
                                        Found {parseResult.extractedInvoice?.items?.length || 0} line item(s)
                                        {parseResult.hasClient ? `, client "${parseResult.extractedInvoice?.recipient?.name}"` : ', no client info'}
                                        {parseResult.hasTemplate ? `, template "${parseResult.extractedInvoice?.template || parseResult.rawTemplateId}"` : ', default template'}.
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase tracking-wider text-[10px]">
                                    Ready
                                </span>
                            </div>
                        ) : (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 animate-in fade-in">
                                <div className="flex items-start gap-2.5">
                                    <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-red-900">Unable to parse JSON</p>
                                        <ul className="mt-1 space-y-1">
                                            {parseResult.errors.map((err, idx) => (
                                                <li key={idx} className="font-mono text-[11px]">• {err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {parseResult.warnings.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 animate-in fade-in">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold">Notice:</span>
                                        <ul className="mt-0.5 space-y-0.5">
                                            {parseResult.warnings.map((warn, idx) => (
                                                <li key={idx}>• {warn}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* STEP 2: CLIENT SELECTION & CONFLICT RESOLUTION */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7 mb-8 transition-all">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
                            2
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                Client Selection & Precedence
                            </h2>
                            <p className="text-xs text-slate-500">
                                Selecting an existing client manually always overrides any client information present in the JSON.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setClientFormData(createEmptyClient());
                            setIsClientModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
                    >
                        <Plus size={16} />
                        Add New Client
                    </button>
                </div>

                {/* RESOLVED CLIENT BANNER */}
                <div className="mt-5">
                    {resolvedData.clientSource === 'manual' ? (
                        <div className="p-4 bg-blue-50/80 border-2 border-blue-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                                    <Check size={20} strokeWidth={3} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white">
                                            Manually Selected (Highest Priority)
                                        </span>
                                        <span className="font-bold text-slate-900 text-base">{resolvedData.clientName}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                                        {resolvedData.invoice.recipient.mobile && <span>Ph: {resolvedData.invoice.recipient.mobile}</span>}
                                        {resolvedData.invoice.recipient.email && <span>Email: {resolvedData.invoice.recipient.email}</span>}
                                        {resolvedData.invoice.recipient.gstNumber && <span className="font-mono">GST: {resolvedData.invoice.recipient.gstNumber}</span>}
                                        {parseResult.hasClient && (
                                            <span className="text-amber-700 font-medium">
                                                (Overriding JSON client: "{parseResult.extractedInvoice?.recipient?.name}")
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedClientId('')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
                                title="Revert to JSON client or walk-in"
                            >
                                <RotateCcw size={14} />
                                Revert / Deselect
                            </button>
                        </div>
                    ) : resolvedData.clientSource === 'json' ? (
                        <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                                    <FileCode2 size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white">
                                            Imported from JSON (Active)
                                        </span>
                                        <span className="font-bold text-slate-900 text-base">{resolvedData.clientName}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                                        {resolvedData.invoice.recipient.mobile && <span>Ph: {resolvedData.invoice.recipient.mobile}</span>}
                                        {resolvedData.invoice.recipient.email && <span>Email: {resolvedData.invoice.recipient.email}</span>}
                                        {resolvedData.invoice.recipient.gstNumber && <span className="font-mono">GST: {resolvedData.invoice.recipient.gstNumber}</span>}
                                        <span className="text-slate-500 italic">
                                            Tip: Select a client from your directory below to override this.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-slate-400" />
                                <span>No client detected in JSON. You can select one from your saved directory below, or proceed as a walk-in invoice.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Client Search */}
                <div className="mt-5">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search clients directory by name, phone, email, or GST..."
                                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                                    aria-label="Clear client search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {clients.length > 0 && (
                            <div className="text-xs font-medium text-slate-500 px-1 whitespace-nowrap">
                                <span>Total <strong>{filteredClients.length}</strong> clients</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Client Cards Grid */}
                <div className="mt-4">
                    {clients.length === 0 ? (
                        <div className="py-8 px-4 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                            <Users size={24} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-xs text-slate-500">No saved clients in directory yet. Clients in JSON can be saved directly into your directory when saving the invoice.</p>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="py-6 px-4 border border-slate-200 rounded-xl text-center bg-slate-50/50">
                            <p className="text-xs text-slate-500">No clients match "{searchQuery}".</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {paginatedClients.map((client) => {
                                    const isSelected = selectedClientId === client.id.toString();
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
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left group ${isSelected
                                                    ? 'border-2 border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${avatarColor}`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-600'}`}>
                                                            {client.name}
                                                        </h4>
                                                        {client.gstNumber && (
                                                            <span className="text-[10px] font-mono text-slate-500">
                                                                GST: {client.gstNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0">
                                                    {isSelected ? (
                                                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                                            <Check size={12} strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-blue-400" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1.5 border-t border-slate-100">
                                                {client.mobile && (
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Phone size={11} className="text-slate-400 shrink-0" />
                                                        <span>{client.mobile}</span>
                                                    </div>
                                                )}
                                                {client.email && (
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Mail size={11} className="text-slate-400 shrink-0" />
                                                        <span>{client.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 text-xs">
                                    <button
                                        type="button"
                                        disabled={!hasPrevPage}
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-medium ${hasPrevPage ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                                            }`}
                                    >
                                        <ChevronLeft size={14} /> Prev
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {pageNumbers.map((p, idx) =>
                                            p === '...' ? (
                                                <span key={`dots-${idx}`} className="px-2 text-slate-400">…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setCurrentPage(Number(p))}
                                                    className={`w-7 h-7 rounded-lg font-bold text-xs ${page === p ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={!hasNextPage}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-medium ${hasNextPage ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                                            }`}
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* STEP 3: TEMPLATE SELECTION & PRECEDENCE */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7 mb-8 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
                            3
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Layout size={20} className="text-blue-600" />
                                Invoice Template & Style
                            </h2>
                            <p className="text-xs text-slate-500">
                                Valid JSON templates are auto-selected. Selecting a template below manually overrides the JSON template.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs font-bold text-slate-700">Active Template:</span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Check size={12} strokeWidth={3} />
                            {resolvedData.templateName}
                            {resolvedData.templateSource === 'manual' && ' (Manual Override)'}
                            {resolvedData.templateSource === 'json' && ' (From JSON)'}
                            {resolvedData.templateSource === 'default' && ' (Default)'}
                        </span>
                        {manualTemplateId && (
                            <button
                                type="button"
                                onClick={() => setManualTemplateId('')}
                                className="text-xs text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
                                title="Revert to JSON or default template"
                            >
                                Reset Override
                            </button>
                        )}
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-5">
                    {allSelectableTemplates.map((tmpl) => {
                        const isSelected = resolvedData.invoice.template === tmpl.id;
                        const isManuallyPicked = manualTemplateId === tmpl.id;

                        return (
                            <div
                                key={tmpl.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                onClick={() => handleSelectTemplate(tmpl.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelectTemplate(tmpl.id);
                                    }
                                }}
                                className={`rounded-xl overflow-hidden border text-left cursor-pointer transition-all flex flex-col justify-between group ${isSelected
                                        ? 'border-2 border-blue-600 shadow-md ring-2 ring-blue-500/20 -translate-y-0.5'
                                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                                    }`}
                            >
                                <div>
                                    <div className={`h-14 ${tmpl.previewColor} w-full relative flex items-center justify-center`}>
                                        {isSelected && (
                                            <div className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center shadow">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <h4 className={`font-bold text-xs truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                                            {tmpl.name}
                                        </h4>
                                        <span className="text-[10px] text-slate-400 capitalize">{tmpl.layout}</span>
                                    </div>
                                </div>
                                {isManuallyPicked && (
                                    <div className="bg-blue-50 text-blue-700 text-[9px] font-bold text-center py-0.5 border-t border-blue-100">
                                        Override
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* STEP 4: LIVE REVIEW / PREVIEW SUMMARY */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7 mb-8 transition-all">
                <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs shadow-sm">
                            4
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Eye size={20} className="text-slate-700" />
                                Invoice Extraction Review
                            </h2>
                            <p className="text-xs text-slate-500">Preview the exact data that will prepopulate the invoice editor.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={resolvedData.invoice.IsGST}
                                onChange={(e) => setManualIsGST(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-xs font-bold text-slate-700">GST Invoice</span>
                            {resolvedData.invoice.IsGST ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase">
                                    Enabled
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">
                                    Disabled (Default)
                                </span>
                            )}
                        </label>
                        {manualIsGST !== null && (
                            <button
                                type="button"
                                onClick={() => setManualIsGST(null)}
                                className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer ml-1"
                                title="Revert to JSON's IsGST value"
                            >
                                Reset to JSON
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Metadata Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Invoice Number</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Hash size={14} className="text-blue-600" />
                            <span>{resolvedData.invoice.number}</span>
                        </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Date</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Calendar size={14} className="text-blue-600" />
                            <span>{resolvedData.invoice.date}</span>
                        </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Client (Billed To)</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 truncate" title={resolvedData.clientName}>
                            <Users size={14} className="text-blue-600 shrink-0" />
                            <span className="truncate">{resolvedData.clientName}</span>
                        </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Grand Total</span>
                        <div className="flex items-center gap-2 text-base font-black text-slate-900">
                            <DollarSign size={16} className="text-emerald-600" />
                            <span>₹{invoiceTotals.total.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: MONEY_DECIMAL_PRECISION })}</span>
                        </div>
                    </div>
                </div>

                {/* Extracted Line Items Table Preview */}
                <div className="mt-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Line Items ({resolvedData.invoice.items.length})
                    </h3>
                    {resolvedData.invoice.items.length === 0 ? (
                        <div className="py-6 px-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                            No items provided in JSON. You will be able to add line items directly in the editor.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="py-2.5 px-3">#</th>
                                        <th className="py-2.5 px-3">Description</th>
                                        {resolvedData.invoice.IsGST && <th className="py-2.5 px-3 text-center">HSN/SAC</th>}
                                        <th className="py-2.5 px-3 text-center">Qty</th>
                                        <th className="py-2.5 px-3 text-right">Rate</th>
                                        {resolvedData.invoice.IsGST && <th className="py-2.5 px-3 text-center">GST %</th>}
                                        <th className="py-2.5 px-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {resolvedData.invoice.items.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                                            <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                            <td className="py-2 px-3 font-semibold text-slate-800">{item.description}</td>
                                            {resolvedData.invoice.IsGST && (
                                                <td className="py-2 px-3 text-center text-slate-500 font-mono">{item.hsnSac || '—'}</td>
                                            )}
                                            <td className="py-2 px-3 text-center text-slate-700">{item.quantity}</td>
                                            <td className="py-2 px-3 text-right text-slate-700">₹{item.price.toLocaleString(DEFAULT_LOCALE)}</td>
                                            {resolvedData.invoice.IsGST && (
                                                <td className="py-2 px-3 text-center text-slate-500">{item.gstRate ?? DEFAULT_GST_RATE}%</td>
                                            )}
                                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                                                ₹{(item.quantity * item.price).toLocaleString(DEFAULT_LOCALE)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                                    <tr>
                                        <td colSpan={resolvedData.invoice.IsGST ? 6 : 4} className="py-2 px-3 text-right text-slate-600">
                                            Subtotal:
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-800">
                                            ₹{invoiceTotals.subtotal.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: MONEY_DECIMAL_PRECISION })}
                                        </td>
                                    </tr>
                                    {resolvedData.invoice.IsGST && (
                                        <tr>
                                            <td colSpan={6} className="py-1 px-3 text-right text-slate-500 text-[11px]">
                                                {resolvedData.invoice.IsIGST ? 'IGST' : 'CGST + SGST'}:
                                            </td>
                                            <td className="py-1 px-3 text-right text-slate-700 text-[11px]">
                                                ₹{invoiceTotals.taxAmount.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: MONEY_DECIMAL_PRECISION })}
                                            </td>
                                        </tr>
                                    )}
                                    {invoiceTotals.discountAmount > 0 && (
                                        <tr>
                                            <td colSpan={resolvedData.invoice.IsGST ? 6 : 4} className="py-1 px-3 text-right text-emerald-600 text-[11px]">
                                                {resolvedData.invoice.discountLabel || DEFAULT_DISCOUNT_LABEL}:
                                            </td>
                                            <td className="py-1 px-3 text-right text-emerald-600 text-[11px]">
                                                -₹{invoiceTotals.discountAmount.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: MONEY_DECIMAL_PRECISION })}
                                            </td>
                                        </tr>
                                    )}
                                    <tr className="border-t border-slate-200 text-sm">
                                        <td colSpan={resolvedData.invoice.IsGST ? 6 : 4} className="py-2.5 px-3 text-right font-black text-slate-900">
                                            Grand Total:
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-black text-slate-900 text-base">
                                            ₹{invoiceTotals.total.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: MONEY_DECIMAL_PRECISION })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* ACTION BAR: CONTINUE TO EDITOR */}
            <div className="sticky bottom-6 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border-2 border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                        <FileSpreadsheet size={22} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">Ready to Generate Invoice</h4>
                        <p className="text-xs text-slate-500">
                            Launch the invoice editor with prefilled data. You can modify any field before saving.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleProceedToEditor}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all cursor-pointer"
                    >
                        <span>Open in Invoice Editor</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            {/* ADD CLIENT MODAL */}
            {isClientModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                Add New Client
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                                <input
                                    type="text"
                                    value={clientFormData.name}
                                    onChange={(e) => setClientFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Company or Person Name"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={clientFormData.mobile}
                                        onChange={(e) =>
                                            setClientFormData((prev) => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))
                                        }
                                        placeholder="10 digit mobile"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={clientFormData.email}
                                        onChange={(e) => setClientFormData((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="billing@example.com"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number (Optional)</label>
                                <input
                                    type="text"
                                    value={clientFormData.gstNumber}
                                    onChange={(e) =>
                                        setClientFormData((prev) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))
                                    }
                                    placeholder="24AAAAA0000A1Z5"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Address</label>
                                <textarea
                                    value={clientFormData.address}
                                    onChange={(e) => setClientFormData((prev) => ({ ...prev, address: e.target.value }))}
                                    placeholder="Address line, City, State, Pincode"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveClientModal}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
                            >
                                Save & Select
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
