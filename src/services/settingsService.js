import { db } from '../db/db.js';
import { DEFAULT_INITIAL_SETTINGS } from './migrationService.js';
import { getDefaultTemplate, resolveValidTemplateId } from './templateService.js';
import {
    STORAGE_KEYS,
    DEFAULT_PROFILE_ID,
    DEXIE_TRANSACTION_MODE
} from '../constants/index.js';

let cachedSettings = null;

/**
 * Hydrates settings cache from Dexie.
 * Merges app_config with companies table and persists repaired template selections.
 * @returns {Promise<object>}
 */
export const loadSettingsFromDb = async () => {
    try {
        const configRecord = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
        const companies = await db.companies.toArray();

        const config = configRecord?.value || DEFAULT_INITIAL_SETTINGS;
        const profileList = companies.length > 0 ? companies : DEFAULT_INITIAL_SETTINGS.companyProfiles;
        const activeId = config.activeProfileId || profileList[0]?.id || DEFAULT_PROFILE_ID;

        const candidateId = config.selectedTemplateId ?? null;
        const selectedTemplateId = await resolveValidTemplateId(candidateId, db);

        if (configRecord && configRecord.value && configRecord.value.selectedTemplateId !== selectedTemplateId) {
            configRecord.value.selectedTemplateId = selectedTemplateId;
            await db.settings.put(configRecord);
        }

        cachedSettings = {
            validation: { ...DEFAULT_INITIAL_SETTINGS.validation, ...(config.validation || {}) },
            display: { ...DEFAULT_INITIAL_SETTINGS.display, ...(config.display || {}) },
            payment: { ...DEFAULT_INITIAL_SETTINGS.payment, ...(config.payment || {}) },
            companyProfiles: profileList,
            activeProfileId: activeId,
            selectedTemplateId: selectedTemplateId
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
            activeProfileId: newSettings.activeProfileId || current.activeProfileId,
            selectedTemplateId: newSettings.selectedTemplateId !== undefined
                ? newSettings.selectedTemplateId
                : (current.selectedTemplateId ?? null)
        };

        await db.transaction(DEXIE_TRANSACTION_MODE.READ_WRITE, [db.settings, db.companies], async () => {
            await db.settings.put({
                key: STORAGE_KEYS.APP_CONFIG,
                value: {
                    validation: merged.validation,
                    display: merged.display,
                    payment: merged.payment,
                    activeProfileId: merged.activeProfileId,
                    selectedTemplateId: merged.selectedTemplateId
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
        const defaultTemplateId = await resolveValidTemplateId(null, db);

        await db.transaction(DEXIE_TRANSACTION_MODE.READ_WRITE, [db.settings, db.companies], async () => {
            await db.settings.put({
                key: STORAGE_KEYS.APP_CONFIG,
                value: {
                    validation: DEFAULT_INITIAL_SETTINGS.validation,
                    display: DEFAULT_INITIAL_SETTINGS.display,
                    payment: DEFAULT_INITIAL_SETTINGS.payment,
                    activeProfileId: DEFAULT_INITIAL_SETTINGS.activeProfileId,
                    selectedTemplateId: defaultTemplateId
                }
            });
            await db.companies.clear();
            await db.companies.bulkPut(DEFAULT_INITIAL_SETTINGS.companyProfiles);
        });

        cachedSettings = {
            ...DEFAULT_INITIAL_SETTINGS,
            selectedTemplateId: defaultTemplateId
        };
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

    await db.transaction(DEXIE_TRANSACTION_MODE.READ_WRITE, [db.companies, db.settings], async () => {
        await db.companies.delete(id);
        const remaining = await db.companies.toArray();
        const configRecord = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
        if (configRecord && configRecord.value.activeProfileId === id) {
            configRecord.value.activeProfileId = remaining[0]?.id || DEFAULT_PROFILE_ID;
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

// --- Template Settings Helpers ---

export const getSelectedTemplateId = () => {
    const settings = getSettings();
    return settings.selectedTemplateId ?? null;
};

export const setSelectedTemplateId = async (id) => {
    let configRecord = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
    if (!configRecord) {
        configRecord = {
            key: STORAGE_KEYS.APP_CONFIG,
            value: {
                ...DEFAULT_INITIAL_SETTINGS,
                selectedTemplateId: id
            }
        };
    } else {
        configRecord.value = {
            ...(configRecord.value || {}),
            selectedTemplateId: id
        };
    }
    await db.settings.put(configRecord);
    await loadSettingsFromDb();
    return true;
};

export const getSelectedTemplateAsync = async () => {
    await loadSettingsFromDb();
    const currentId = getSelectedTemplateId();
    if (currentId != null && db.templates) {
        const found = await db.templates.get(currentId);
        if (found) return found;
    }
    return await getDefaultTemplate(db);
};
