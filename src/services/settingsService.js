import { db } from '../db/db.js';
import { DEFAULT_INITIAL_SETTINGS } from './migrationService.js';
import { STORAGE_KEYS } from '../constants/index.js';

let cachedSettings = null;

/**
 * Hydrates settings cache from Dexie.
 * Merges app_config with companies table.
 * @returns {Promise<object>}
 */
export const loadSettingsFromDb = async () => {
    try {
        const configRecord = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
        const companies = await db.companies.toArray();

        const config = configRecord?.value || DEFAULT_INITIAL_SETTINGS;
        const profileList = companies.length > 0 ? companies : DEFAULT_INITIAL_SETTINGS.companyProfiles;
        const activeId = config.activeProfileId || profileList[0]?.id || 'default';

        cachedSettings = {
            validation: { ...DEFAULT_INITIAL_SETTINGS.validation, ...(config.validation || {}) },
            display: { ...DEFAULT_INITIAL_SETTINGS.display, ...(config.display || {}) },
            payment: { ...DEFAULT_INITIAL_SETTINGS.payment, ...(config.payment || {}) },
            companyProfiles: profileList,
            activeProfileId: activeId
        };
        return cachedSettings;
    } catch (error) {
        console.error('Error loading settings from Dexie:', error);
        cachedSettings = { ...DEFAULT_INITIAL_SETTINGS };
        return cachedSettings;
    }
};

/**
 * Get current settings (synchronous from cache, fallback to defaults).
 * @returns {object}
 */
export const getSettings = () => {
    if (cachedSettings) return cachedSettings;
    return { ...DEFAULT_INITIAL_SETTINGS };
};

/**
 * Get settings asynchronously directly from Dexie.
 * @returns {Promise<object>}
 */
export const getSettingsAsync = async () => {
    return await loadSettingsFromDb();
};

/**
 * Update application settings in Dexie.
 * @param {object} newSettings
 * @returns {Promise<object>}
 */
export const updateSettings = async (newSettings) => {
    try {
        const current = cachedSettings || DEFAULT_INITIAL_SETTINGS;
        const merged = {
            ...current,
            ...newSettings,
            validation: { ...current.validation, ...(newSettings.validation || {}) },
            display: { ...current.display, ...(newSettings.display || {}) },
            payment: { ...current.payment, ...(newSettings.payment || {}) },
            activeProfileId: newSettings.activeProfileId || current.activeProfileId
        };

        await db.transaction('rw', [db.settings, db.companies], async () => {
            await db.settings.put({
                key: STORAGE_KEYS.APP_CONFIG,
                value: {
                    validation: merged.validation,
                    display: merged.display,
                    payment: merged.payment,
                    activeProfileId: merged.activeProfileId
                }
            });

            if (Array.isArray(newSettings.companyProfiles)) {
                await db.companies.clear();
                await db.companies.bulkPut(newSettings.companyProfiles);
                merged.companyProfiles = newSettings.companyProfiles;
            }
        });

        cachedSettings = merged;
        return merged;
    } catch (error) {
        console.error('Error saving settings to Dexie:', error);
        return newSettings;
    }
};

/**
 * Reset settings to default values.
 * @returns {Promise<object>}
 */
export const resetSettings = async () => {
    try {
        await db.transaction('rw', [db.settings, db.companies], async () => {
            await db.settings.put({
                key: STORAGE_KEYS.APP_CONFIG,
                value: {
                    validation: DEFAULT_INITIAL_SETTINGS.validation,
                    display: DEFAULT_INITIAL_SETTINGS.display,
                    payment: DEFAULT_INITIAL_SETTINGS.payment,
                    activeProfileId: DEFAULT_INITIAL_SETTINGS.activeProfileId
                }
            });
            await db.companies.clear();
            await db.companies.bulkPut(DEFAULT_INITIAL_SETTINGS.companyProfiles);
        });

        cachedSettings = { ...DEFAULT_INITIAL_SETTINGS };
        return cachedSettings;
    } catch (error) {
        console.error('Error resetting settings:', error);
        return DEFAULT_INITIAL_SETTINGS;
    }
};

// --- Profile Management Helpers ---

export const getCompanyProfiles = () => {
    const settings = getSettings();
    return settings.companyProfiles || [];
};

export const getCompanyProfilesAsync = async () => {
    const companies = await db.companies.toArray();
    return companies.length > 0 ? companies : DEFAULT_INITIAL_SETTINGS.companyProfiles;
};

export const getActiveProfile = () => {
    const settings = getSettings();
    const profiles = settings.companyProfiles || [];
    return profiles.find(p => p.id === settings.activeProfileId) || profiles[0] || null;
};

export const getActiveProfileAsync = async () => {
    await loadSettingsFromDb();
    return getActiveProfile();
};

export const addCompanyProfile = async (profile) => {
    const newProfile = { ...profile, id: Date.now().toString() };
    await db.companies.put(newProfile);
    await loadSettingsFromDb();
    return newProfile;
};

export const updateCompanyProfile = async (id, updates) => {
    const existing = await db.companies.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    await db.companies.put(updated);
    await loadSettingsFromDb();
    return updated;
};

export const deleteCompanyProfile = async (id) => {
    const companies = await db.companies.toArray();
    if (companies.length <= 1) return false;

    await db.transaction('rw', [db.companies, db.settings], async () => {
        await db.companies.delete(id);
        const remaining = await db.companies.toArray();
        const configRecord = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
        if (configRecord && configRecord.value.activeProfileId === id) {
            configRecord.value.activeProfileId = remaining[0]?.id || 'default';
            await db.settings.put(configRecord);
        }
    });

    await loadSettingsFromDb();
    return true;
};

export const setActiveProfile = async (id) => {
    const configRecord = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
    if (configRecord) {
        configRecord.value.activeProfileId = id;
        await db.settings.put(configRecord);
    }
    await loadSettingsFromDb();
    return true;
};
