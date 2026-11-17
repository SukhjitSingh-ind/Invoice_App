import { db } from '../db/db.js';
import { transformInvoiceForDexie } from './migrationService.js';
import { loadInvoicesFromDb } from './invoiceService.js';
import { loadClientsFromDb } from './clientService.js';
import { loadItemsFromDb } from './itemService.js';
import { loadSettingsFromDb } from './settingsService.js';
import { STORAGE_KEYS } from '../constants/index.js';

/**
 * Export a single JSON file containing invoices, clients, items, companies and settings from Dexie.
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function exportFullBackup() {
    try {
        const invoices = await db.invoices.toArray();
        const clients = await db.clients.toArray();
        const items = await db.items.toArray();
        const companies = await db.companies.toArray();
        const configRecord = await db.settings.get(STORAGE_KEYS.APP_CONFIG);

        const backup = {
            type: STORAGE_KEYS.FULL_BACKUP_TYPE,
            version: 2,
            exportedAt: new Date().toISOString(),
            data: {
                invoices,
                clients,
                items,
                companies,
                settings: configRecord?.value || null
            }
        };

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `invoice_app_full_backup_${dateStr}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error('Error exporting full backup:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Import a full JSON backup and restore into Dexie.js.
 * Enforces canonical GST contract on all imported invoices.
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

        const { invoices, clients, items, settings, companies } = parsed.data;

        if (!Array.isArray(invoices)) {
            throw new Error('Invalid backup file: invoices must be an array');
        }
        if (!Array.isArray(clients)) {
            throw new Error('Invalid backup file: clients must be an array');
        }
        if (!Array.isArray(items)) {
            throw new Error('Invalid backup file: items must be an array');
        }

        // Clean & standardize invoices
        const safeInvoices = invoices
            .filter((inv) => inv && (inv.id != null) && typeof inv.number === 'string')
            .map((inv) => transformInvoiceForDexie(inv));

        const safeClients = clients.filter((c) => c && typeof c.name === 'string');
        const safeItems = items.filter((it) => it && typeof it.name === 'string');

        // Extract companies (either from dedicated array or legacy settings.companyProfiles)
        let safeCompanies = [];
        if (Array.isArray(companies)) {
            safeCompanies = companies.filter(c => c && typeof c.name === 'string');
        } else if (settings && Array.isArray(settings.companyProfiles)) {
            safeCompanies = settings.companyProfiles;
        }

        // Apply data atomically
        await db.transaction('rw', [db.invoices, db.clients, db.items, db.companies, db.settings], async () => {
            await db.invoices.clear();
            await db.clients.clear();
            await db.items.clear();
            await db.companies.clear();

            if (safeInvoices.length > 0) await db.invoices.bulkPut(safeInvoices);
            if (safeClients.length > 0) await db.clients.bulkPut(safeClients);
            if (safeItems.length > 0) await db.items.bulkPut(safeItems);
            if (safeCompanies.length > 0) await db.companies.bulkPut(safeCompanies);

            if (settings && typeof settings === 'object') {
                await db.settings.put({
                    key: STORAGE_KEYS.APP_CONFIG,
                    value: {
                        validation: settings.validation,
                        display: settings.display,
                        payment: settings.payment,
                        activeProfileId: settings.activeProfileId || safeCompanies[0]?.id || 'default'
                    }
                });
            }
        });

        // Hydrate all memory caches
        await Promise.all([
            loadInvoicesFromDb(),
            loadClientsFromDb(),
            loadItemsFromDb(),
            loadSettingsFromDb()
        ]);

        return {
            success: true,
            counts: {
                invoices: safeInvoices.length,
                clients: safeClients.length,
                items: safeItems.length
            }
        };
    } catch (error) {
        console.error('Error importing full backup:', error);
        return { success: false, message: error.message };
    }
}
