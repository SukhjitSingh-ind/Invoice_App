import { db } from '../db/db.js';
import { transformInvoiceForDexie, DEFAULT_INITIAL_SETTINGS } from './migrationService.js';
import { loadInvoicesFromDb } from './invoiceService.js';
import { loadClientsFromDb } from './clientService.js';
import { loadItemsFromDb } from './itemService.js';
import { loadSettingsFromDb } from './settingsService.js';
import { resolveValidTemplateId, seedBuiltInTemplates } from './templateService.js';
import {
    STORAGE_KEYS,
    CURRENT_BACKUP_VERSION,
    MIME_TYPES,
    DEXIE_TRANSACTION_MODE,
    DEFAULT_PROFILE_ID,
    DEFAULT_BUILT_IN_TEMPLATE_NAME
} from '../constants/index.js';

/**
 * Assembles the full backup data structure from Dexie tables.
 * Separated from file download logic for clean testability and environment independence.
 *
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<object>}
 */
export async function createFullBackupData(dbInstance = db) {
    const invoices = await dbInstance.invoices.toArray();
    const clients = await dbInstance.clients.toArray();
    const items = await dbInstance.items.toArray();
    const companies = await dbInstance.companies.toArray();
    const templates = await dbInstance.templates.toArray();
    const configRecord = await dbInstance.settings.get(STORAGE_KEYS.APP_CONFIG);

    return {
        type: STORAGE_KEYS.FULL_BACKUP_TYPE,
        version: CURRENT_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
            invoices,
            clients,
            items,
            companies,
            settings: configRecord?.value || null,
            templates
        }
    };
}

/**
 * Export a single JSON file containing invoices, clients, items, companies, settings, and templates from Dexie.
 * In a browser environment, triggers a file download. In non-browser environments, serializes the backup payload.
 *
 * @returns {Promise<{ success: boolean, backup?: object, downloaded: boolean, message?: string }>}
 */
export async function exportFullBackup() {
    try {
        const backup = await createFullBackupData(db);
        const json = JSON.stringify(backup, null, 2);
        let downloaded = false;

        if (typeof document !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            const blob = new Blob([json], { type: MIME_TYPES.JSON });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.download = `invoice_app_full_backup_${dateStr}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            downloaded = true;
        }

        return { success: true, backup, downloaded };
    } catch (error) {
        console.error('Error exporting full backup:', error);
        return { success: false, message: error.message, downloaded: false };
    }
}

/**
 * Import a full JSON backup and restore into Dexie.js.
 * Restores templates and preserves or safely falls back for selectedTemplateId.
 * Explicitly replaces settings with sensible defaults when backup settings are null/missing.
 * Backward compatible with legacy backups lacking a templates collection.
 *
 * @param {string} jsonData
 * @returns {Promise<{ success: boolean, counts?: object, message?: string }>}
 */
export async function importFullBackup(jsonData) {
    try {
        const parsed = JSON.parse(jsonData);

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid backup file: not a JSON object');
        }

        if (parsed.type !== STORAGE_KEYS.FULL_BACKUP_TYPE) {
            throw new Error('Invalid backup type: this file is not a full app backup');
        }

        if (!parsed.data || typeof parsed.data !== 'object') {
            throw new Error('Invalid backup file: missing data section');
        }

        const { invoices, clients, items, settings, companies, templates } = parsed.data;

        if (!Array.isArray(invoices)) {
            throw new Error('Invalid backup file: invoices must be an array');
        }
        if (!Array.isArray(clients)) {
            throw new Error('Invalid backup file: clients must be an array');
        }
        if (!Array.isArray(items)) {
            throw new Error('Invalid backup file: items must be an array');
        }

        const safeInvoices = invoices
            .filter((inv) => inv && (inv.id != null) && typeof inv.number === 'string')
            .map((inv) => transformInvoiceForDexie(inv));

        const safeClients = clients.filter((c) => c && typeof c.name === 'string');
        const safeItems = items.filter((it) => it && typeof it.name === 'string');

        let safeCompanies = [];
        if (Array.isArray(companies)) {
            safeCompanies = companies.filter(c => c && typeof c.name === 'string');
        } else if (settings && Array.isArray(settings.companyProfiles)) {
            safeCompanies = settings.companyProfiles;
        }

        let safeTemplates = null;
        if (Array.isArray(templates)) {
            safeTemplates = templates.filter(t => t && typeof t.name === 'string');
            const defaultTemplates = safeTemplates.filter(t => Boolean(t.isDefault));
            if (defaultTemplates.length > 1) {
                const candidateId = settings?.selectedTemplateId;
                const preferred = defaultTemplates.find(t => t.id === candidateId) ||
                    defaultTemplates.find(t => t.name === DEFAULT_BUILT_IN_TEMPLATE_NAME) ||
                    defaultTemplates[0];
                for (const t of safeTemplates) {
                    t.isDefault = (t === preferred);
                }
            }
        }

        await db.transaction(
            DEXIE_TRANSACTION_MODE.READ_WRITE,
            [db.invoices, db.clients, db.items, db.companies, db.templates, db.settings],
            async () => {
                await db.invoices.clear();
                await db.clients.clear();
                await db.items.clear();
                await db.companies.clear();

                if (safeInvoices.length > 0) await db.invoices.bulkPut(safeInvoices);
                if (safeClients.length > 0) await db.clients.bulkPut(safeClients);
                if (safeItems.length > 0) await db.items.bulkPut(safeItems);
                if (safeCompanies.length > 0) await db.companies.bulkPut(safeCompanies);

                if (safeTemplates !== null) {
                    await db.templates.clear();
                    if (safeTemplates.length > 0) {
                        await db.templates.bulkPut(safeTemplates);
                    }
                }

                const candidateTemplateId = settings?.selectedTemplateId ?? null;
                const restoredSelectedTemplateId = await resolveValidTemplateId(candidateTemplateId, db);

                const restoredSettingsValue = (settings && typeof settings === 'object')
                    ? {
                        validation: { ...DEFAULT_INITIAL_SETTINGS.validation, ...(settings.validation || {}) },
                        display: { ...DEFAULT_INITIAL_SETTINGS.display, ...(settings.display || {}) },
                        payment: { ...DEFAULT_INITIAL_SETTINGS.payment, ...(settings.payment || {}) },
                        activeProfileId: settings.activeProfileId || safeCompanies[0]?.id || DEFAULT_PROFILE_ID,
                        selectedTemplateId: restoredSelectedTemplateId
                    }
                    : {
                        validation: { ...DEFAULT_INITIAL_SETTINGS.validation },
                        display: { ...DEFAULT_INITIAL_SETTINGS.display },
                        payment: { ...DEFAULT_INITIAL_SETTINGS.payment },
                        activeProfileId: safeCompanies[0]?.id || DEFAULT_PROFILE_ID,
                        selectedTemplateId: restoredSelectedTemplateId
                    };

                await db.settings.put({
                    key: STORAGE_KEYS.APP_CONFIG,
                    value: restoredSettingsValue
                });
            }
        );

        const currentTemplateCount = await db.templates.count();
        if (currentTemplateCount === 0) {
            await seedBuiltInTemplates(db);
        }

        await Promise.all([
            loadInvoicesFromDb(),
            loadClientsFromDb(),
            loadItemsFromDb(),
            loadSettingsFromDb()
        ]);

        const finalTemplateCount = await db.templates.count();

        return {
            success: true,
            counts: {
                invoices: safeInvoices.length,
                clients: safeClients.length,
                items: safeItems.length,
                templates: finalTemplateCount
            }
        };
    } catch (error) {
        console.error('Error importing full backup:', error);
        return { success: false, message: error.message };
    }
}
