import React, { useState } from 'react';
import { Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { getSettings, updateSettings, resetSettings } from '../services/settingsService';
import { exportInvoices, importInvoices } from '../services/invoiceService';
import { exportClientsToJSON, importClientsFromJSON } from '../services/clientService';
import { exportItemsToJSON, importItemsFromJSON } from '../services/itemService';
import { exportFullBackup, importFullBackup } from '../services/backupService';
import { useToast } from '../components/Toast';

export default function Settings() {
    const [settings, setSettings] = useState(() => getSettings());
    const [saved, setSaved] = useState(false);
    const { addToast } = useToast();

    if (!settings) return <div>Loading...</div>;

    const handleToggle = (category, field) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: !prev[category][field]
            }
        }));
        setSaved(false);
    };

    const handleSave = () => {
        updateSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
            const defaults = resetSettings();
            setSettings(defaults);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-2">Settings</h1>
                    <p className="text-slate-600 text-lg">Configure validation rules and preferences for your invoices</p>
                </div>

                {/* Save Success Banner */}
                {saved && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-center gap-3 animate-fade-in">
                        <CheckCircle2 className="text-green-600" size={24} />
                        <p className="text-green-800 font-semibold">Settings saved successfully!</p>
                    </div>
                )}

                {/* Settings Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    {/* Field Validation Section */}
                    <div className="p-8 border-b border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                            Field Validation
                        </h2>
                        <p className="text-slate-600 mb-6">Control which fields require validation when creating or editing invoices</p>

                        <div className="space-y-4">
                            {/* Price Validation */}
                            <ToggleItem
                                label="Price must be greater than zero"
                                description="Prevent saving items with zero or negative prices"
                                checked={settings.validation.priceGreaterThanZero}
                                onChange={() => handleToggle('validation', 'priceGreaterThanZero')}
                            />

                            {/* Quantity Validation */}
                            <ToggleItem
                                label="Quantity must be greater than zero"
                                description="Prevent saving items with zero or negative quantities"
                                checked={settings.validation.quantityGreaterThanZero}
                                onChange={() => handleToggle('validation', 'quantityGreaterThanZero')}
                            />

                            {/* Invoice Number Required */}
                            <ToggleItem
                                label="Invoice number is required"
                                description="Require an invoice number before saving"
                                checked={settings.validation.requireInvoiceNumber}
                                onChange={() => handleToggle('validation', 'requireInvoiceNumber')}
                            />

                            {/* Client Name Required */}
                            <ToggleItem
                                label="Client name is required"
                                description="Require a client/recipient name before saving"
                                checked={settings.validation.requireClientName}
                                onChange={() => handleToggle('validation', 'requireClientName')}
                            />

                            {/* Client Mobile Required */}
                            <ToggleItem
                                label="Client mobile number is required"
                                description="Require a mobile number for new clients"
                                checked={settings.validation.requireClientMobile}
                                onChange={() => handleToggle('validation', 'requireClientMobile')}
                            />

                            {/* Item Description Required */}
                            <ToggleItem
                                label="Item descriptions are required"
                                description="Require descriptions for all line items"
                                checked={settings.validation.requireItemDescription}
                                onChange={() => handleToggle('validation', 'requireItemDescription')}
                            />
                        </div>
                    </div>

                    {/* Display Preferences */}
                    <div className="mt-8 bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            Display Preferences
                        </h2>
                        <p className="text-slate-600 mb-6">Control what appears in your printed invoices</p>

                        <div className="space-y-4">
                            {/* Show Logo */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                <div className="flex-1">
                                    <label className="text-sm font-bold text-slate-900 block mb-1">
                                        Show Company Logo
                                    </label>
                                    <p className="text-xs text-slate-600">
                                        Display your company logo in invoice headers
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings(prev => ({
                                            ...prev,
                                            display: { ...prev.display, showLogo: !prev.display.showLogo }
                                        }));
                                        setSaved(false);
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.display?.showLogo ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.display?.showLogo ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Show QR Code */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                <div className="flex-1">
                                    <label className="text-sm font-bold text-slate-900 block mb-1">
                                        Show Payment QR Code
                                    </label>
                                    <p className="text-xs text-slate-600">
                                        Display QR code for quick payments in invoice footer
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings(prev => ({
                                            ...prev,
                                            display: { ...prev.display, showQrCode: !prev.display.showQrCode }
                                        }));
                                        setSaved(false);
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.display?.showQrCode ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.display?.showQrCode ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Payment Settings */}
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                Payment Settings
                            </h3>

                            <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                                {/* UPI ID */}
                                <div className="p-4 border-b border-slate-200">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <label className="text-sm font-bold text-slate-900 block mb-1">
                                                UPI ID
                                            </label>
                                            <p className="text-xs text-slate-600 mb-2">
                                                Enter your UPI ID (VPA) for dynamic QR codes
                                            </p>
                                            <input
                                                type="text"
                                                value={settings.payment?.upiId || ''}
                                                onChange={(e) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        payment: { ...prev.payment, upiId: e.target.value }
                                                    }));
                                                    setSaved(false);
                                                }}
                                                placeholder="e.g. merchant@upi"
                                                className="w-full text-sm p-2 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payee Name */}
                                <div className="p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <label className="text-sm font-bold text-slate-900 block mb-1">
                                                Payee Name
                                            </label>
                                            <p className="text-xs text-slate-600 mb-2">
                                                Name to be displayed in the UPI app
                                            </p>
                                            <input
                                                type="text"
                                                value={settings.payment?.payeeName || ''}
                                                onChange={(e) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        payment: { ...prev.payment, payeeName: e.target.value }
                                                    }));
                                                    setSaved(false);
                                                }}
                                                placeholder="e.g. My Business Name"
                                                className="w-full text-sm p-2 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Data Management Section */}
                    <div className="mt-8 bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </div>
                            Data Management
                        </h2>
                        <p className="text-slate-600 mb-6">Backup and restore your data</p>

                        {/* Full app backup/restore */}
                        <div className="mb-6">
                            <DataCard
                                title="Full App Backup"
                                icon={(
                                    <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                )}
                                onExport={() => {
                                    const result = exportFullBackup();
                                    if (result.success) {
                                        addToast('Full backup exported successfully!', 'success');
                                    } else {
                                        addToast(`Failed to export full backup: ${result.message}`, 'error');
                                    }
                                }}
                                onImport={(fileContent) => {
                                    if (!window.confirm('Restoring a full backup will overwrite existing invoices, clients, items, and settings. Continue?')) {
                                        return;
                                    }
                                    const result = importFullBackup(fileContent);
                                    if (result.success) {
                                        addToast(
                                            `Backup restored. Invoices: ${result.counts.invoices}, Clients: ${result.counts.clients}, Items: ${result.counts.items}`,
                                            'success'
                                        );
                                        // Reload settings in UI so toggles reflect restored values
                                        const refreshed = getSettings();
                                        setSettings(refreshed);
                                    } else {
                                        addToast(`Restore failed: ${result.message}`, 'error');
                                    }
                                }}
                            />
                            <p className="mt-2 text-xs text-slate-500 text-center">
                                Use this for a complete backup/restore across devices or browsers.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Invoices Card */}
                            <DataCard
                                title="Invoices"
                                icon={(
                                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                onExport={() => {
                                    const success = exportInvoices();
                                    if (success) addToast('Invoices exported successfully!', 'success');
                                    else addToast('Failed to export invoices', 'error');
                                }}
                                onImport={(fileContent) => {
                                    const result = importInvoices(fileContent);
                                    if (result.success) {
                                        addToast(`Imported ${result.added} new, Updated ${result.updated} invoices`, 'success');
                                    } else {
                                        addToast(`Import failed: ${result.message}`, 'error');
                                    }
                                }}
                            />

                            {/* Clients Card */}
                            <DataCard
                                title="Clients"
                                icon={(
                                    <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                                onExport={() => {
                                    try {
                                        exportClientsToJSON();
                                        addToast('Clients exported successfully!', 'success');
                                    } catch {
                                        addToast('Failed to export clients', 'error');
                                    }
                                }}
                                onImport={(fileContent) => {
                                    try {
                                        const result = importClientsFromJSON(fileContent);
                                        if (result.success) {
                                            addToast(`Imported ${result.count} clients successfully`, 'success');
                                        }
                                    } catch (e) {
                                        addToast(`Import failed: ${e.message}`, 'error');
                                    }
                                }}
                            />

                            {/* Items Card */}
                            <DataCard
                                title="Items"
                                icon={(
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                )}
                                onExport={() => {
                                    try {
                                        exportItemsToJSON();
                                        addToast('Items exported successfully!', 'success');
                                    } catch {
                                        addToast('Failed to export items', 'error');
                                    }
                                }}
                                onImport={(fileContent) => {
                                    try {
                                        const result = importItemsFromJSON(fileContent);
                                        if (result.success) {
                                            addToast(`Imported ${result.count} items successfully`, 'success');
                                        }
                                    } catch (e) {
                                        addToast(`Import failed: ${e.message}`, 'error');
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
                {/* Action Buttons */}
                <div className="bg-slate-50 p-6 flex justify-between items-center rounded-xl mt-8">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 text-slate-700 font-semibold hover:bg-slate-200 rounded-lg transition-all"
                    >
                        <RotateCcw size={18} />
                        Reset to Defaults
                    </button>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                        <Save size={18} />
                        Save Settings
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5 max-w-4xl mx-auto">
                <p className="text-blue-900 text-sm leading-relaxed">
                    <strong className="font-bold">💡 Tip:</strong> Validation settings are applied when creating or editing invoices.
                    Fields that fail validation will be highlighted with a red border, and you won't be able to save until they're corrected.
                </p>
            </div>
        </div>
    );
}

// Toggle Item Component
function ToggleItem({ label, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200">
            <div className="flex-1">
                <h3 className="text-slate-900 font-bold text-lg mb-1">{label}</h3>
                <p className="text-slate-600 text-sm">{description}</p>
            </div>
            <button
                onClick={onChange}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200 ${checked ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
            >
                <span
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );
}

// Reusable Data Card Component
function DataCard({ title, icon, onExport, onImport }) {
    return (
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center text-center">
            <div className="mb-4 text-slate-700 bg-white p-4 rounded-full shadow-sm">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>

            <div className="w-full space-y-3">
                <button
                    onClick={onExport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                </button>

                <div className="relative w-full">
                    <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            const reader = new FileReader();
                            reader.onload = (event) => {
                                onImport(event.target.result);
                                e.target.value = ''; // Reset input
                            };
                            reader.readAsText(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import
                    </button>
                </div>
            </div>
        </div>
    );
}
