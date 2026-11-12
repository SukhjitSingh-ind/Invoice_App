import React, { useState, useEffect, useRef } from 'react';
import {
    Building2, Plus, Trash2, Check, Star, Upload,
    MapPin, Phone, Mail, FileText, CreditCard, Save
} from 'lucide-react';
import {
    getSettings, updateSettings,
    getCompanyProfiles, addCompanyProfile,
    updateCompanyProfile, deleteCompanyProfile,
    setActiveProfile, getActiveProfile
} from '../services/settingsService';
import { useToast } from '../components/Toast';

export default function YourDetails() {
    const [profiles, setProfiles] = useState([]);
    const [activeProfileId, setActiveProfileId] = useState(null);
    const [selectedProfileId, setSelectedProfileId] = useState(null);
    const [pendingProfileId, setPendingProfileId] = useState(null); // For unsaved changes modal
    const [formData, setFormData] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = useRef(null);
    const { addToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const settings = getSettings();
        const currentProfiles = getCompanyProfiles();
        const currentActiveId = settings.activeProfileId;

        setProfiles(currentProfiles);
        setActiveProfileId(currentActiveId);

        // Select the active profile by default if nothing selected
        if (!selectedProfileId) {
            const active = currentProfiles.find(p => p.id === currentActiveId);
            if (active) {
                setSelectedProfileId(active.id);
                setFormData(active);
            } else if (currentProfiles.length > 0) {
                setSelectedProfileId(currentProfiles[0].id);
                setFormData(currentProfiles[0]);
            }
        } else {
            // Refresh selected profile data
            const selected = currentProfiles.find(p => p.id === selectedProfileId);
            if (selected) setFormData(selected);
        }
    };

    const selectProfile = (id) => {
        const profile = profiles.find(p => p.id === id);
        setSelectedProfileId(id);
        setFormData(profile);
        setIsDirty(false);
        setPendingProfileId(null);
    };

    const handleProfileSelect = (id) => {
        if (id === selectedProfileId) return;

        if (isDirty) {
            setPendingProfileId(id);
            return;
        }
        selectProfile(id);
    };

    const handleConfirmDiscard = () => {
        if (pendingProfileId) {
            selectProfile(pendingProfileId);
        }
    };

    const handleAddProfile = () => {
        const newProfile = {
            name: 'New Company',
            address: '',
            state: '',
            phone: '',
            email: '',
            gstNumber: '',
            bankDetails: {
                bankName: '',
                accountNumber: '',
                ifscCode: '',
                accountHolder: ''
            },
            logo: ''
        };
        const created = addCompanyProfile(newProfile);
        setProfiles(prev => [...prev, created]);
        setSelectedProfileId(created.id);
        setFormData(created);
        setIsDirty(false);
        addToast('New profile created', 'success');
    };

    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleDeleteProfile = (e, id) => {
        e.stopPropagation();
        if (profiles.length <= 1) {
            addToast('Cannot delete the last profile', 'error');
            return;
        }
        setDeleteConfirm(id);
    };

    const confirmDelete = () => {
        if (!deleteConfirm) return;

        const id = deleteConfirm;
        const success = deleteCompanyProfile(id);

        if (success) {
            addToast('Profile deleted', 'success');
            // If we deleted the selected profile, switch to the first available
            if (id === selectedProfileId) {
                const remaining = profiles.filter(p => p.id !== id);
                if (remaining.length > 0) {
                    setSelectedProfileId(remaining[0].id);
                    setFormData(remaining[0]);
                }
            }
            loadData(); // Refresh all state
        }
        setDeleteConfirm(null);
    };

    const handleSetGlobalActive = (e, id) => {
        e.stopPropagation();
        setActiveProfile(id);
        setActiveProfileId(id);
        addToast('Active profile updated', 'success');
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setIsDirty(true);
    };

    const handleBankChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            bankDetails: {
                ...prev.bankDetails,
                [field]: value
            }
        }));
        setIsDirty(true);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5000000) { // 5MB limit
                addToast('File size too large (max 5MB)', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    logo: reader.result
                }));
                setIsDirty(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            addToast('Company Name is required', 'error');
            return;
        }

        if (!formData.logo) {
            addToast('Company Logo is required', 'error');
            return;
        }
        updateCompanyProfile(selectedProfileId, formData);
        setIsDirty(false);
        loadData(); // Refresh list to show updated names etc
        addToast('Profile saved successfully', 'success');
    };

    if (!formData) return <div>Loading...</div>;

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] bg-slate-50">
            {/* Sidebar List */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <Building2 size={20} className="text-blue-600" />
                        Company Profiles
                    </h2>
                    <button
                        onClick={handleAddProfile}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        title="Add New Profile"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            onClick={() => handleProfileSelect(profile.id)}
                            className={`
                group relative p-4 rounded-xl cursor-pointer border transition-all duration-200
                ${selectedProfileId === profile.id
                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                    : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                                }
              `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`font-bold ${selectedProfileId === profile.id ? 'text-blue-900' : 'text-slate-700'}`}>
                                    {profile.name}
                                </h3>
                                {activeProfileId === profile.id && (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Check size={10} /> Active
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-500 line-clamp-1 mb-3">
                                {profile.address || 'No address set'}
                            </p>

                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {activeProfileId !== profile.id && (
                                    <button
                                        onClick={(e) => handleSetGlobalActive(e, profile.id)}
                                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                        title="Set as Active Profile"
                                    >
                                        <Star size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => handleDeleteProfile(e, profile.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete Profile"
                                    disabled={profiles.length <= 1}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Edit Form */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
                <div className="max-w-3xl mx-auto p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 mb-2">Edit Details</h1>
                            <p className="text-slate-600">Update company information for this profile</p>
                        </div>

                        <div className="flex gap-3">
                            {activeProfileId !== selectedProfileId && (
                                <button
                                    onClick={(e) => handleSetGlobalActive(e, selectedProfileId)}
                                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                    <Star size={18} className="text-yellow-500" />
                                    Set as Active
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={!isDirty}
                                className={`
                  px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md
                  ${isDirty
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }
                `}
                            >
                                <Save size={20} />
                                Save Changes
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Section */}
                        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Upload size={16} className="text-blue-500" />
                                Company Logo <span className="text-red-500">*</span>
                            </h3>
                            <div className="flex items-center gap-6">
                                <div
                                    className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {formData.logo ? (
                                        <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-slate-400 text-xs text-center px-2">Click to upload</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="text-white" size={24} />
                                    </div>
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                    <p className="text-sm text-slate-600 mb-2">
                                        Upload your company logo.
                                        <br />Recommended size: 500x500px.
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-blue-600 text-sm font-semibold hover:underline"
                                    >
                                        Choose Image
                                    </button>
                                    {formData.logo && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleChange('logo', '');
                                            }}
                                            className="text-red-500 text-sm font-semibold hover:underline ml-4"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Building2 size={16} className="text-blue-500" />
                                Basic Information
                            </h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    placeholder="Street, City, ZIP..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State (for GST)</label>
                                <input
                                    type="text"
                                    value={formData.state || ''}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="e.g. 24-Gujarat"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="+91..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="contact@company.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tax & Banking */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <CreditCard size={16} className="text-blue-500" />
                                Tax & Banking
                            </h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GST Number</label>
                                <input
                                    type="text"
                                    value={formData.gstNumber}
                                    onChange={(e) => handleChange('gstNumber', e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="GSTIN..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank Name</label>
                                    <input
                                        type="text"
                                        value={formData.bankDetails?.bankName || ''}
                                        onChange={(e) => handleBankChange('bankName', e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Bank Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Number</label>
                                    <input
                                        type="text"
                                        value={formData.bankDetails?.accountNumber || ''}
                                        onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Account No."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={formData.bankDetails?.ifscCode || ''}
                                        onChange={(e) => handleBankChange('ifscCode', e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="IFSC"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Holder</label>
                                    <input
                                        type="text"
                                        value={formData.bankDetails?.accountHolder || ''}
                                        onChange={(e) => handleBankChange('accountHolder', e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Holder Name"
                                    />
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                deleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Profile?</h3>
                            <p className="text-slate-600 mb-6">Are you sure you want to delete <strong>{profiles.find(p => p.id === deleteConfirm)?.name}</strong>? This cannot be undone.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 bg-slate-100 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Unsaved Changes Confirmation Modal */}
            {pendingProfileId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Unsaved Changes</h3>
                        <p className="text-slate-600 mb-6">You have unsaved changes. Are you sure you want to discard them and switch profiles?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPendingProfileId(null)}
                                className="flex-1 px-4 py-2 bg-slate-100 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDiscard}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                            >
                                Discard & Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
