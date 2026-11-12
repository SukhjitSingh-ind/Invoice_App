const SETTINGS_KEY = 'invoice_app_settings';

// Default settings
const DEFAULT_SETTINGS = {
    validation: {
        requireInvoiceNumber: true,
        requireClientName: true,
        requireClientMobile: false,
        priceGreaterThanZero: true,
        quantityGreaterThanZero: true,
        requireItemDescription: true
    },
    display: {
        showLogo: true,
        showQrCode: true,
        showUnit: true
    },
    payment: {
        upiId: '',
        payeeName: ''
    },
    companyProfiles: [
        {
            id: 'default',
            name: 'GK AUTO ELECTRIC WORKS',
            address: 'ISHWAR ARCADE shop no 11 asalali Cross\nroad nearby Kheda road Ahmedabad Gujarat.',
            state: '24-Gujarat',
            phone: '8141378031',
            email: 'asr989898@gmail.com',
            gstNumber: '24DTJPS4161K1Z9',
            bankDetails: {
                bankName: 'BANK OF BARODA',
                accountNumber: '55420200000625',
                ifscCode: 'BARB0GHOAHM',
                accountHolder: 'GURU KALGIDAR AUTO ELECTRIC WORKS'
            },
            logo: '' // Base64 UUID
        }
    ],
    activeProfileId: 'default'
};

/**
 * Get current settings from localStorage
 * @returns {Object} Current settings object
 */
export const getSettings = () => {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        if (!data) {
            // Initialize with defaults if not found
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
            return DEFAULT_SETTINGS;
        }
        const saved = JSON.parse(data);

        // Merge with defaults to ensure new fields are present
        return {
            ...DEFAULT_SETTINGS,
            ...saved,
            validation: { ...DEFAULT_SETTINGS.validation, ...saved.validation },
            display: { ...DEFAULT_SETTINGS.display, ...saved.display },
            payment: { ...DEFAULT_SETTINGS.payment, ...saved.payment },
            // Ensure companyProfiles exists if it wasn't there before
            companyProfiles: saved.companyProfiles || DEFAULT_SETTINGS.companyProfiles,
            activeProfileId: saved.activeProfileId || DEFAULT_SETTINGS.activeProfileId
        };
    } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
};

/**
 * Update settings in localStorage
 * @param {Object} newSettings - New settings object
 * @returns {Object} Updated settings
 */
export const updateSettings = (newSettings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        return newSettings;
    } catch (error) {
        console.error('Error saving settings:', error);
        return newSettings;
    }
};

/**
 * Reset settings to defaults
 * @returns {Object} Default settings
 */
export const resetSettings = () => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Error resetting settings:', error);
        return DEFAULT_SETTINGS;
    }
};

// --- Profile Management Helpers ---

export const getCompanyProfiles = () => {
    const settings = getSettings();
    return settings.companyProfiles || [];
};

export const getActiveProfile = () => {
    const settings = getSettings();
    const profiles = settings.companyProfiles || [];
    return profiles.find(p => p.id === settings.activeProfileId) || profiles[0] || null;
};

export const addCompanyProfile = (profile) => {
    const settings = getSettings();
    const newProfile = { ...profile, id: Date.now().toString() };
    const updatedSettings = {
        ...settings,
        companyProfiles: [...(settings.companyProfiles || []), newProfile]
    };
    updateSettings(updatedSettings);
    return newProfile;
};

export const updateCompanyProfile = (id, updates) => {
    const settings = getSettings();
    const updatedProfiles = (settings.companyProfiles || []).map(p =>
        p.id === id ? { ...p, ...updates } : p
    );
    const updatedSettings = { ...settings, companyProfiles: updatedProfiles };
    updateSettings(updatedSettings);
    return updatedProfiles.find(p => p.id === id);
};

export const deleteCompanyProfile = (id) => {
    const settings = getSettings();
    const profiles = settings.companyProfiles || [];

    // Prevent deleting the last profile
    if (profiles.length <= 1) return false;

    const updatedProfiles = profiles.filter(p => p.id !== id);

    // If active profile is deleted, switch to the first one
    let activeProfileId = settings.activeProfileId;
    if (activeProfileId === id) {
        activeProfileId = updatedProfiles[0].id;
    }

    const updatedSettings = {
        ...settings,
        companyProfiles: updatedProfiles,
        activeProfileId
    };
    updateSettings(updatedSettings);
    return true;
};

export const setActiveProfile = (id) => {
    const settings = getSettings();
    const updatedSettings = { ...settings, activeProfileId: id };
    updateSettings(updatedSettings);
    return true;
};
