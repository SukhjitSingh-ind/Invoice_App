import React, { useState } from 'react';
import {
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Book,
    FileText,
    Users,
    Package,
    BarChart3,
    Settings,
    FileCode2,
    CheckCircle2,
    Copy,
    Check,
    Layers,
    ShieldCheck,
    Calculator,
    AlertTriangle,
    Sparkles
} from 'lucide-react';

const FAQItem = ({ question, answer, isOpen, onClick }) => (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
        <button
            onClick={onClick}
            className="w-full flex justify-between items-center p-4 bg-white hover:bg-slate-50 transition-colors text-left"
        >
            <span className="font-bold text-slate-900">{question}</span>
            {isOpen ? <ChevronUp className="text-blue-600" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
        </button>
        {isOpen && (
            <div className="p-4 bg-slate-50 border-t border-slate-200">
                <p className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">{answer}</p>
            </div>
        )}
    </div>
);

const CodeSnippet = ({ code, title }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner my-3 text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 text-slate-300 font-mono">
                <span>{title || 'JSON Payload'}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="p-4 text-slate-100 font-mono overflow-x-auto text-xs leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
};

export default function Help() {
    const [openFAQ, setOpenFAQ] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const toggleFAQ = (index) => {
        setOpenFAQ(openFAQ === index ? null : index);
    };

    const faqs = [
        {
            question: "How do I create my first invoice?",
            answer: "1. Click 'Create Invoice' in the sidebar\n2. Select a template (Classic or Modern)\n3. Choose whether to include GST\n4. Fill in client details and add items\n5. Click 'Save' and then 'Preview & Print' to generate your invoice"
        },
        {
            question: "Does Create Invoice from JSON enable GST by default?",
            answer: "No. IsGST strictly defaults to false unless explicitly specified as 'IsGST': true in the JSON payload or manually toggled ON by the user. If IsGST is omitted or set to false, the invoice generates as a standard non-tax invoice with 0% tax, suppressing GST columns and tax breakdowns."
        },
        {
            question: "How do CGST, SGST, and IGST differ in invoice calculations?",
            answer: "When IsGST is true:\n• Intrastate (IsIGST = false): The total tax amount is split equally 50/50 between Central GST (CGST) and State GST (SGST).\n• Interstate (IsIGST = true): The full tax amount is assigned to Integrated GST (IGST).\nWhen IsGST is false, tax calculation is completely bypassed regardless of IsIGST."
        },
        {
            question: "What happens if I select a client from the directory while my JSON already contains client data?",
            answer: "Manual selection takes authoritative precedence. The selected directory client's information will completely override the client details present in the JSON. Client information from JSON is never blended or merged with the directory client, preventing accidental data corruption."
        },
        {
            question: "Can I edit an invoice after importing it from JSON?",
            answer: "Yes! The JSON import page extracts the data and pre-populates the standard Invoice Editor. Once inside the editor, every single line item, price, quantity, address, note, discount, and template remains 100% editable before saving."
        },
        {
            question: "How do I add items from my library to an invoice?",
            answer: "1. First, create items in the Items page\n2. When creating an invoice, look for the blue 'Add from Item Library' section\n3. Select an item from the dropdown\n4. Click 'Add Item' - the item will be added with pre-filled data\n5. You can edit the price or any other details as needed"
        },
        {
            question: "Can I use the same item at different prices in different invoices?",
            answer: "Yes! Items from your library are templates. When you add them to an invoice, all fields are editable. The library item's default price won't change when you modify prices in individual invoices."
        },
        {
            question: "How do I manage my clients?",
            answer: "1. Go to the Clients page from the sidebar\n2. Click 'Create Client' to add a new client\n3. Fill in their details (name, mobile, GST number, etc.)\n4. Clients are automatically saved when you create invoices\n5. You can export/import client data for backup"
        },
        {
            question: "What's the difference between Classic and Modern invoice templates?",
            answer: "Classic templates use traditional structured grids ideal for formal enterprise and corporate billing. Modern templates feature full-width header accents and contemporary typography. Both layouts support GST, discounts, and custom branding."
        },
        {
            question: "How do I add a discount to an invoice?",
            answer: "1. In the invoice editor, scroll to the totals section\n2. Find the 'Discount' row near the total\n3. Enter the discount amount\n4. Choose between fixed amount (₹) or percentage (%)\n5. You can also customize the discount label"
        },
        {
            question: "How do I export reports?",
            answer: "1. Go to the Reports page\n2. View the analytics and pie charts\n3. Click 'Export to Excel' buttons:\n   - 'Export All' creates a multi-sheet Excel with all data\n   - Section-specific export buttons for items or clients only\n4. Files download with date stamps automatically"
        },
        {
            question: "How do I backup my data?",
            answer: "You can export data from multiple places:\n1. Clients page - Export/Import client data\n2. Items page - Export/Import items library\n3. Reports page - Export complete analytics to Excel\nAll data is stored in your browser's localStorage, so clearing browser data will delete invoices."
        }
    ];

    const guides = [
        {
            icon: FileCode2,
            title: "Create Invoice from JSON",
            color: "indigo",
            steps: [
                "Open 'Create from JSON' from the sidebar or invoice header",
                "Paste valid JSON or upload a .json file",
                "Review live validation and extracted line items",
                "Optionally select a directory client or template override",
                "Click 'Open in Invoice Editor' to review and customize",
                "Save and preview the generated invoice"
            ]
        },
        {
            icon: FileText,
            title: "Standard Invoice Creation",
            color: "blue",
            steps: [
                "Navigate to 'Create Invoice' from sidebar",
                "Choose your preferred template",
                "Select GST option if needed (default: disabled)",
                "Fill in client information or choose from directory",
                "Add items manually or from library",
                "Review totals and add discounts if needed",
                "Save and preview your invoice"
            ]
        },
        {
            icon: Users,
            title: "Managing Clients",
            color: "purple",
            steps: [
                "Go to Clients page",
                "Click 'Create Client' to add new",
                "Fill in client details (name, mobile, GST, address)",
                "Clients auto-save when creating invoices",
                "Search clients using search bar",
                "Export/Import for backup"
            ]
        },
        {
            icon: Package,
            title: "Item Library",
            color: "orange",
            steps: [
                "Navigate to Items page",
                "Create items with name, price, HSN/SAC",
                "Set default GST rate and unit",
                "Use items in invoices with one click",
                "Prices are editable per invoice",
                "Export/Import your item library"
            ]
        },
        {
            icon: BarChart3,
            title: "Reports & Analytics",
            color: "green",
            steps: [
                "Open Reports from sidebar",
                "View summary cards for quick insights",
                "Check pie charts for top performers",
                "Expand items to see price history",
                "Expand clients to see purchase details",
                "Export data to Excel for further analysis"
            ]
        }
    ];

    const features = [
        { icon: FileCode2, title: "JSON Invoice Import", desc: "Create pre-filled invoices in seconds by pasting or uploading structured JSON files" },
        { icon: FileText, title: "Multiple Templates", desc: "Choose between 8 professionally crafted layouts including Classic and Modern" },
        { icon: Package, title: "Item Library", desc: "Create reusable items with default prices, HSN/SAC codes, and GST rates" },
        { icon: Users, title: "Client Management", desc: "Store and manage client information with deterministic override precedence" },
        { icon: BarChart3, title: "Analytics", desc: "Track sales, revenue, and client purchase patterns with charts and Excel exports" },
        { icon: Book, title: "GST & Non-GST Billing", desc: "Flexible GST support (CGST, SGST, IGST) with IsGST defaulting to false" }
    ];

    // Example JSON Payloads
    const sampleCompleteJson = JSON.stringify({
        invoiceNumber: "INV-2026-001",
        issueDate: "2026-11-16",
        dueDate: "2026-11-30",
        template: "modern_indigo",
        IsGST: false,
        client: {
            name: "Acme Technologies Pvt Ltd",
            mobile: "9876543210",
            email: "billing@acme.com",
            address: "402 Tech Park, SG Highway, Ahmedabad, Gujarat",
            gstNumber: "24AAACA1234A1Z5"
        },
        items: [
            {
                description: "Cloud Architecture Design & Consulting",
                quantity: 1,
                rate: 35000,
                unit: "Service",
                hsnSac: "998314"
            },
            {
                description: "Full-Stack Web Application Engineering",
                quantity: 2,
                rate: 20000,
                unit: "Milestone",
                hsnSac: "998315"
            }
        ],
        discountType: "fixed",
        discountValue: 2500,
        discountLabel: "Volume Rebate",
        notes: "Thank you for partnering with us. Please make payments within 15 days of invoice date."
    }, null, 2);

    const sampleGstIntrastate = JSON.stringify({
        invoiceNumber: "INV-GST-INTRA-101",
        issueDate: "2026-11-16",
        IsGST: true,
        IsIGST: false,
        client: {
            name: "Gujarat Retail Solutions",
            gstNumber: "24AAAAA0000A1Z5",
            address: "Ahmedabad, Gujarat"
        },
        items: [
            {
                description: "Industrial Machine Maintenance",
                quantity: 1,
                price: 10000,
                gstRate: 18,
                hsnSac: "9987"
            }
        ],
        notes: "Tax split: 9% CGST (₹900) + 9% SGST (₹900)"
    }, null, 2);

    const sampleGstInterstate = JSON.stringify({
        invoiceNumber: "INV-GST-INTER-202",
        issueDate: "2026-11-16",
        IsGST: true,
        IsIGST: true,
        placeOfSupply: "27-Maharashtra",
        client: {
            name: "Mumbai Trade Enterprises",
            gstNumber: "27BBBBB1111B1Z2",
            address: "Nariman Point, Mumbai, Maharashtra"
        },
        items: [
            {
                description: "Interstate Software Licensing",
                quantity: 1,
                price: 25000,
                gstRate: 18,
                hsnSac: "997331"
            }
        ],
        notes: "Tax allocation: 18% Integrated GST (IGST ₹4,500)"
    }, null, 2);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
            <div className="max-w-6xl mx-auto pb-16">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
                        <HelpCircle className="text-blue-600" size={36} />
                        Help & Documentation
                    </h1>
                    <p className="text-slate-600 text-lg">
                        Comprehensive user guides and technical reference documentation for Invoice Manager.
                    </p>
                </div>

                {/* FEATURE SPOTLIGHT: Create Invoice from JSON */}
                <section className="bg-white rounded-2xl shadow-xl border-2 border-indigo-200 overflow-hidden mb-10 transition-all">
                    {/* Spotlight Header Banner */}
                    <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 p-6 md:p-8 text-white">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">
                            <Sparkles size={14} className="text-amber-400" />
                            <span>Major Feature Documentation</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                            <FileCode2 size={36} className="text-indigo-400" />
                            Create Invoice from JSON
                        </h2>
                        <p className="text-indigo-200 mt-2 text-base max-w-3xl leading-relaxed">
                            A production-ready workflow enabling users to generate invoices instantly by pasting or uploading JSON payloads. It automatically normalizes structured data, resolves client and template precedence, and prepopulates the standard editor.
                        </p>

                        {/* Navigation Tabs */}
                        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-indigo-800/80">
                            {[
                                { id: 'overview', label: 'Overview & Steps' },
                                { id: 'schema', label: 'Supported JSON Schema' },
                                { id: 'precedence', label: 'Client & Template Precedence' },
                                { id: 'gst', label: 'GST & Tax Architecture' },
                                { id: 'validation', label: 'Validation & Errors' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === tab.id
                                            ? 'bg-white text-indigo-950 shadow-md'
                                            : 'bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab 1: Overview & Step-by-Step Guide */}
                    {activeTab === 'overview' && (
                        <div className="p-6 md:p-8 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">How It Works</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    The JSON invoice creation workflow bridges programmatic external data (such as CRM records, e-commerce webhooks, or custom billing scripts) with the application's rich visual invoice editor. It parses incoming JSON, validates structure against the application's domain rules, extracts available metadata, and forwards the pre-filled invoice into the editor for final review and saving.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <h4 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                                        <FileCode2 size={16} className="text-indigo-600" />
                                        Direct Paste Input
                                    </h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Paste JSON text directly into the integrated code editor. Built-in tools allow formatting indentation, clearing contents, and viewing live syntax diagnostics.
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <h4 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                                        <Book size={16} className="text-blue-600" />
                                        Native File Upload
                                    </h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Upload any valid <code>.json</code> file from your machine. The file is read locally using the browser's <code>FileReader</code> API without uploading data to external servers.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3">Step-by-Step User Instructions</h3>
                                <div className="space-y-2.5">
                                    {[
                                        "Open 'Create from JSON' from the left navigation sidebar or by clicking 'From JSON' on the Invoices list.",
                                        "Paste your JSON into the editor or click 'Upload JSON' to select a .json file from your computer.",
                                        "Verify the live validation badge. If syntax errors exist, the diagnostic panel identifies the exact parsing issue.",
                                        "Review the extracted summary card, which displays invoice number, issue date, client name, and line items.",
                                        "Optionally select a directory client if you want to override the client provided in JSON.",
                                        "Optionally select an invoice template if you want to override the visual layout.",
                                        "Toggle the GST switch if you wish to toggle Tax Invoice mode (Default: Disabled / IsGST = false).",
                                        "Click 'Open in Invoice Editor' in the sticky bottom action bar.",
                                        "Review all prepopulated fields inside the standard editor, make any final edits, and click 'Save & Preview'."
                                    ].map((step, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs text-slate-700">
                                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                                                {idx + 1}
                                            </span>
                                            <span className="pt-0.5">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Supported JSON Schema & Fields Reference */}
                    {activeTab === 'schema' && (
                        <div className="p-6 md:p-8 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">Supported JSON Structure & Field Dictionary</h3>
                                <p className="text-xs text-slate-500">
                                    The JSON parser is schema-tolerant and accommodates partial payloads, optional properties, and property aliases. Below is the authoritative field specification.
                                </p>
                            </div>

                            {/* Reference Table */}
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Field / Property</th>
                                            <th className="py-2.5 px-3">Type</th>
                                            <th className="py-2.5 px-3">Required</th>
                                            <th className="py-2.5 px-3">Default / Fallback</th>
                                            <th className="py-2.5 px-3">Description & Aliases</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">invoiceNumber</td>
                                            <td className="py-2 px-3 text-slate-600">string | number</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">Next auto-number (e.g. #10)</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Unique invoice number.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">issueDate</td>
                                            <td className="py-2 px-3 text-slate-600">string (YYYY-MM-DD)</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">Today's ISO date</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Invoice creation date.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">dueDate</td>
                                            <td className="py-2 px-3 text-slate-600">string (YYYY-MM-DD)</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">None</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Payment due date. Automatically appended to invoice notes if provided.</td>
                                        </tr>
                                        <tr className="bg-amber-50/50">
                                            <td className="py-2 px-3 font-bold text-amber-800">IsGST</td>
                                            <td className="py-2 px-3 text-slate-600">boolean</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 font-bold text-red-600">false</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Master tax toggle. When true, enables Tax Invoice mode.</td>
                                        </tr>
                                        <tr className="bg-amber-50/50">
                                            <td className="py-2 px-3 font-bold text-amber-800">IsIGST</td>
                                            <td className="py-2 px-3 text-slate-600">boolean</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 font-bold text-red-600">false</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Interstate tax toggle. When true with IsGST, allocates 100% tax to IGST.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">template</td>
                                            <td className="py-2 px-3 text-slate-600">string</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">'default'</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Visual template ID (e.g. <code>modern_indigo</code>, <code>corporate</code>, <code>minimal</code>, <code>luxury_gold</code>).</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">client</td>
                                            <td className="py-2 px-3 text-slate-600">object</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">Walk-in client</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Buyer details: <code>name</code>, <code>mobile</code>, <code>email</code>, <code>address</code>, <code>gstNumber</code>, <code>state</code>.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">items</td>
                                            <td className="py-2 px-3 text-slate-600">array&lt;object&gt;</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">[] (empty array)</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Array of line items. Each item supports: <code>description</code>, <code>quantity</code>, <code>price</code>, <code>hsnSac</code>, <code>unit</code>, <code>gstRate</code>.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">discount</td>
                                            <td className="py-2 px-3 text-slate-600">number | object</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">0</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Can be numeric (fixed ₹) or object <code>{`{ type: 'fixed'|'percentage', value: 10, label: 'Early' }`}</code>.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">notes</td>
                                            <td className="py-2 px-3 text-slate-600">string</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">Empty string</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Invoice remarks or customer notes.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">termsAndConditions</td>
                                            <td className="py-2 px-3 text-slate-600">string</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">Empty string</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Terms of trade printed on GST invoices.</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-bold text-indigo-700">bankDetails</td>
                                            <td className="py-2 px-3 text-slate-600">object</td>
                                            <td className="py-2 px-3 text-slate-500">Optional</td>
                                            <td className="py-2 px-3 text-slate-500">Active profile bank</td>
                                            <td className="py-2 px-3 font-sans text-slate-700">Payment details: <code>bankName</code>, <code>accountNumber</code>, <code>ifscCode</code>, <code>accountHolder</code>.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <h4 className="font-bold text-sm text-slate-900 mb-1">Complete Reference JSON</h4>
                                <CodeSnippet code={sampleCompleteJson} title="complete-invoice-sample.json" />
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Client & Template Precedence */}
                    {activeTab === 'precedence' && (
                        <div className="p-6 md:p-8 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">Deterministic Data Precedence Hierarchy</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    To guarantee data consistency and prevent accidental loss of user intent, the application enforces strict resolution rules.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Client Precedence Box */}
                                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                                    <h4 className="font-bold text-base text-slate-900 mb-2 flex items-center gap-2">
                                        <Users size={18} className="text-blue-600" />
                                        Client Resolution Rules
                                    </h4>
                                    <div className="space-y-3 text-xs text-slate-700">
                                        <div className="p-3 bg-white border border-blue-200 rounded-lg">
                                            <span className="font-bold text-blue-700 block mb-1">Priority 1: Manually Selected Client (Highest)</span>
                                            If the user explicitly clicks a client card from the directory on the JSON import page, that client's details take total precedence over any client provided in JSON.
                                        </div>
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                            <span className="font-bold text-slate-800 block mb-1">Priority 2: JSON-Provided Client (Fallback)</span>
                                            If the user does not select a directory client, the system extracts and uses the <code>client</code> object from the JSON.
                                        </div>
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                            <span className="font-bold text-slate-800 block mb-1">Priority 3: Walk-in Default (Final Fallback)</span>
                                            If neither is provided, recipient fields initialize blank (walk-in client).
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-3 italic">
                                        * Important: Data from the JSON client and the directory client is never blended or merged. Deselecting the manual client cleanly reverts back to the JSON client.
                                    </p>
                                </div>

                                {/* Template Precedence Box */}
                                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                                    <h4 className="font-bold text-base text-slate-900 mb-2 flex items-center gap-2">
                                        <Layers size={18} className="text-purple-600" />
                                        Template Resolution Rules
                                    </h4>
                                    <div className="space-y-3 text-xs text-slate-700">
                                        <div className="p-3 bg-white border border-purple-200 rounded-lg">
                                            <span className="font-bold text-purple-700 block mb-1">Priority 1: Manually Selected Template (Highest)</span>
                                            Clicking any template card on the JSON creation page overrides the template defined in JSON.
                                        </div>
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                            <span className="font-bold text-slate-800 block mb-1">Priority 2: JSON-Provided Valid Template (Fallback)</span>
                                            If the JSON specifies a recognized template identifier (e.g. <code>modern_indigo</code>), that template is automatically activated.
                                        </div>
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                            <span className="font-bold text-slate-800 block mb-1">Priority 3: Default Template ('default')</span>
                                            If the template is omitted or references an unrecognized ID (e.g. <code>unknown_style</code>), the system displays a warning and safely falls back to 'default' ("Professional Clean").
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: GST & Tax Architecture */}
                    {activeTab === 'gst' && (
                        <div className="p-6 md:p-8 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">GST & Tax Architecture</h3>
                                <p className="text-xs text-slate-500">
                                    Detailed technical breakdown of how GST flags, statutory tax splits, and calculations operate.
                                </p>
                            </div>

                            {/* IsGST vs IsIGST Explanations */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                        Master Flag
                                    </span>
                                    <h4 className="font-bold text-base text-slate-900 mt-2 mb-1">IsGST (Default: false)</h4>
                                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 mt-2">
                                        <li><strong>Default:</strong> Strictly <code>false</code> when omitted.</li>
                                        <li><strong>When false:</strong> Header displays <strong>"INVOICE"</strong>. Tax calculation evaluates strictly to ₹0. HSN/SAC, GST %, and Place of Supply columns are hidden.</li>
                                        <li><strong>When true:</strong> Header displays <strong>"TAX INVOICE"</strong>. Activates item-level GST calculations, HSN/SAC display, amount in words, and legal bank footers.</li>
                                        <li><strong>Preservation:</strong> Explicit <code>"IsGST": false</code> is respected and never overridden by client GST numbers.</li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                        Distribution Flag
                                    </span>
                                    <h4 className="font-bold text-base text-slate-900 mt-2 mb-1">IsIGST (Default: false)</h4>
                                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 mt-2">
                                        <li><strong>Prerequisite:</strong> Only takes effect when <code>IsGST: true</code>.</li>
                                        <li><strong>When false (Intrastate):</strong> Tax is split 50/50 into <strong>CGST</strong> (Central GST) and <strong>SGST</strong> (State GST).</li>
                                        <li><strong>When true (Interstate):</strong> 100% of the computed tax is allocated to <strong>IGST</strong> (Integrated GST).</li>
                                        <li><strong>State Rule:</strong> Used when supplier and buyer are located in different states (or specified via <code>placeOfSupply</code>).</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Calculation Formulas */}
                            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs">
                                <h4 className="font-bold text-amber-400 mb-2 font-sans text-sm flex items-center gap-2">
                                    <Calculator size={16} /> Statutory Calculation Engine Formulas
                                </h4>
                                <div className="space-y-1 text-slate-300">
                                    <p>1. Item Subtotal      = Quantity × Price</p>
                                    <p>2. Item Tax (if GST)  = Item Subtotal × (gstRate / 100)  [Default gstRate: 18%]</p>
                                    <p>3. Total Tax Amount   = IsGST ? Sum(Item Tax) : 0</p>
                                    <p>4. CGST Amount        = IsGST && !IsIGST ? Total Tax / 2 : 0</p>
                                    <p>5. SGST Amount        = IsGST && !IsIGST ? Total Tax / 2 : 0</p>
                                    <p>6. IGST Amount        = IsGST && IsIGST ? Total Tax : 0</p>
                                    <p>7. Pre-Discount Total = Subtotal + Total Tax Amount</p>
                                    <p>8. Discount Amount    = Percentage ? (Pre-Discount × Value / 100) : Fixed Value</p>
                                    <p>9. Grand Total        = Pre-Discount Total - Discount Amount</p>
                                    <p>10. Balance Due       = Grand Total - Received Amount</p>
                                </div>
                            </div>

                            {/* 3 JSON Examples */}
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 mb-2">Example 1: Non-GST Invoice (IsGST = false or omitted)</h4>
                                <CodeSnippet code={JSON.stringify({ invoiceNumber: "INV-NON-GST", IsGST: false, items: [{ description: "Service", quantity: 1, price: 5000 }] }, null, 2)} title="non-gst-example.json" />

                                <h4 className="font-bold text-sm text-slate-900 mt-4 mb-2">Example 2: Intrastate GST Invoice (CGST + SGST)</h4>
                                <CodeSnippet code={sampleGstIntrastate} title="gst-intrastate-sample.json" />

                                <h4 className="font-bold text-sm text-slate-900 mt-4 mb-2">Example 3: Interstate GST Invoice (IGST)</h4>
                                <CodeSnippet code={sampleGstInterstate} title="gst-interstate-sample.json" />
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Validation & Error Handling */}
                    {activeTab === 'validation' && (
                        <div className="p-6 md:p-8 space-y-5">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">Validation Rules & Error Recovery</h3>
                                <p className="text-xs text-slate-500">
                                    How the application handles syntax errors, missing properties, and invalid data types.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-red-950">Malformed Syntax / Invalid JSON</h5>
                                        <p className="mt-0.5 text-red-800">
                                            If JSON contains syntax mistakes (missing quotation marks, unclosed brackets, trailing commas), the parser captures the exact parser exception and displays a red diagnostic banner. The 'Open in Invoice Editor' button is temporarily disabled until syntax errors are resolved.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                                    <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-amber-950">Non-Object Root Element</h5>
                                        <p className="mt-0.5 text-amber-800">
                                            The root JSON payload must be an object (e.g. <code>{`{ ... }`}</code>). Passing arrays (<code>{`[ ... ]`}</code>) or primitive values (e.g. <code>42</code>) produces a clean error explaining that an invoice object is expected.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-blue-950">Missing Optional Fields & Graceful Defaults</h5>
                                        <p className="mt-0.5 text-blue-800">
                                            Missing fields never cause crashes: omitted invoice numbers default to the next sequence number; omitted dates default to today; omitted clients initialize as walk-in clients; omitted items default to an empty list ready for additions in the editor.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-3">
                                    <Layers size={18} className="text-slate-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-slate-900">Unsupported or Unexpected Properties</h5>
                                        <p className="mt-0.5 text-slate-600">
                                            Arbitrary extra fields (e.g. <code>customMetadata</code>, <code>externalSyncId</code>) are safely tolerated and do not interfere with invoice extraction or normalization.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Quick Start Guides */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Book className="text-blue-600" size={24} />
                        Quick Start Guides
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {guides.map((guide, index) => (
                            <div key={index} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`p-3 bg-${guide.color}-100 rounded-lg`}>
                                            <guide.icon className={`text-${guide.color}-600`} size={24} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">{guide.title}</h3>
                                    </div>
                                    <ol className="space-y-2">
                                        {guide.steps.map((step, stepIndex) => (
                                            <li key={stepIndex} className="text-xs text-slate-600 flex gap-2">
                                                <span className="font-bold text-blue-600">{stepIndex + 1}.</span>
                                                <span>{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Key Features */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Features</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                                <feature.icon className="text-blue-600 flex-shrink-0" size={20} />
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">{feature.title}</h4>
                                    <p className="text-xs text-slate-600">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
                    <div>
                        {faqs.map((faq, index) => (
                            <FAQItem
                                key={index}
                                question={faq.question}
                                answer={faq.answer}
                                isOpen={openFAQ === index}
                                onClick={() => toggleFAQ(index)}
                            />
                        ))}
                    </div>
                </div>

                {/* Tips Section */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mt-8 text-white">
                    <h2 className="text-2xl font-bold mb-4">💡 Pro Tips</h2>
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300 font-bold">•</span>
                            <span>Use <strong>Create from JSON</strong> for automated billing integrations, customer CRM exports, or bulk invoice generation.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300 font-bold">•</span>
                            <span>Remember that <code>IsGST</code> defaults to <code>false</code>. If your business requires GST invoices, include <code>"IsGST": true</code> in your JSON or use the toggle on the creation page.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300 font-bold">•</span>
                            <span>Use the search function on the Invoices page to quickly find invoices by client name, invoice number, or total amount.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300 font-bold">•</span>
                            <span>Regularly export your data (Clients, Items, Reports) to have safe offline Excel backups of your business information.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
