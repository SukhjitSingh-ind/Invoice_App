import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Book, FileText, Users, Package, BarChart3, Settings, Video } from 'lucide-react';

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
                <p className="text-slate-700 whitespace-pre-line">{answer}</p>
            </div>
        )}
    </div>
);

export default function Help() {
    const [openFAQ, setOpenFAQ] = useState(null);

    const toggleFAQ = (index) => {
        setOpenFAQ(openFAQ === index ? null : index);
    };

    const faqs = [
        {
            question: "How do I create my first invoice?",
            answer: "1. Click 'Create Invoice' in the sidebar\n2. Select a template (Classic or Modern)\n3. Choose whether to include GST\n4. Fill in client details and add items\n5. Click 'Save' and then 'Preview & Print' to generate your invoice"
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
            answer: "Classic template has a traditional layout suitable for formal business invoices.\nModern template has a contemporary design with better visual hierarchy.\nBoth templates support all features including GST, discounts, and bank details."
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
            question: "What analytics can I see in Reports?",
            answer: "Reports show:\n- Total revenue, invoices, clients, and items\n- Top items by revenue and quantity (pie charts)\n- Top clients by spending (pie chart)\n- Price trends (min, max, avg) for each item\n- Which clients bought which items\n- Detailed price history with dates and invoice numbers"
        },
        {
            question: "How do I backup my data?",
            answer: "You can export data from multiple places:\n1. Clients page - Export/Import client data\n2. Items page - Export/Import items library\n3. Reports page - Export complete analytics to Excel\nAll data is stored in your browser's localStorage, so clearing browser data will delete invoices."
        },
        {
            question: "Can I edit an invoice after saving it?",
            answer: "Yes! Go to the Invoices page, find your invoice, and click the edit icon. You can modify any details and save again. The invoice number will remain the same."
        }
    ];

    const guides = [
        {
            icon: FileText,
            title: "Creating Invoices",
            color: "blue",
            steps: [
                "Navigate to 'Create Invoice' from sidebar",
                "Choose your preferred template",
                "Select GST option if needed",
                "Fill in client information",
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
        { icon: FileText, title: "Multiple Templates", desc: "Choose between Classic and Modern invoice layouts" },
        { icon: Package, title: "Item Library", desc: "Create reusable items with default prices and details" },
        { icon: Users, title: "Client Management", desc: "Store and manage client information efficiently" },
        { icon: BarChart3, title: "Analytics", desc: "Track sales, revenue, and client behavior with charts" },
        { icon: Settings, title: "Customization", desc: "Configure validation rules and default settings" },
        { icon: Book, title: "GST Support", desc: "Full support for GST invoices with CGST/SGST/IGST" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
                        <HelpCircle className="text-blue-600" size={36} />
                        Help & Documentation
                    </h1>
                    <p className="text-slate-600 text-lg">Everything you need to know about using Invoice Manager</p>
                </div>

                {/* Quick Start Guides */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Book className="text-blue-600" size={24} />
                        Quick Start Guides
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {guides.map((guide, index) => (
                            <div key={index} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 bg-${guide.color}-100 rounded-lg`}>
                                        <guide.icon className={`text-${guide.color}-600`} size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">{guide.title}</h3>
                                </div>
                                <ol className="space-y-2">
                                    {guide.steps.map((step, stepIndex) => (
                                        <li key={stepIndex} className="text-sm text-slate-600 flex gap-2">
                                            <span className="font-bold text-blue-600">{stepIndex + 1}.</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
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
                                    <p className="text-sm text-slate-600">{feature.desc}</p>
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
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 mt-8 text-white">
                    <h2 className="text-2xl font-bold mb-4">💡 Pro Tips</h2>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300">•</span>
                            <span>Use the search function in Invoices page to quickly find invoices by client name, invoice number, or total amount</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300">•</span>
                            <span>Create items in your library before making invoices to save time - you can add them with one click!</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300">•</span>
                            <span>Regularly export your data (Clients, Items, Reports) to have backups of your business information</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300">•</span>
                            <span>Check the Reports page regularly to identify your best-selling items and top clients</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-300">•</span>
                            <span>Use the Settings page to customize validation rules based on your business needs</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
