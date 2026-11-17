import { db } from '../db/db.js';
import { generateUniqueInvoiceId } from '../utils/idGenerator.js';

export const MIGRATION_MARKER = 'invoice_app_dexie_migrated';
export const MIGRATION_LOCK = 'invoice_app_migration_lock';
export const LEGACY_INVOICE_KEY = 'invoice_app_data';
export const LEGACY_CLIENT_KEY = 'invoice_app_clients';
export const LEGACY_ITEM_KEY = 'invoice_app_items';
export const LEGACY_SETTINGS_KEY = 'invoice_app_settings';

export const DEFAULT_INITIAL_INVOICES = [
    {
        id: 1731427200000,
        number: '#9',
        date: '2025-11-22',
        sender: {
            name: 'GK AUTO ELECTRIC WORKS',
            address: 'ISHWAR ARCADE shop no 11 asalali Cross\nroad nearby Kheda road Ahmedabad Gujarat.',
            phone: '',
            gstNumber: ''
        },
        recipient: {
            name: 'Guru Kripa Crane Service',
            mobile: '8141378031'
        },
        items: [
            { id: 1, description: 'Bosch ECM Repairing', quantity: 1, price: 25500 },
            { id: 2, description: 'Mundra Breakdown Service Charge', quantity: 1, price: 10000 },
            { id: 3, description: 'Laptop Scanning', quantity: 1, price: 3500 },
            { id: 4, description: 'Mundra Up/Down Service (Travel/Transport)', quantity: 1, price: 3500 },
            { id: 5, description: 'Mundra breakdown service ECM wiring check', quantity: 1, price: 7500 }
        ],
        currency: '₹',
        notes: 'Zoomlion Crane (80 Ton)',
        paymentInfo: '8141378031mokbizar',
        template: 'default',
        IsGST: false,
        IsIGST: false
    }
];

export const DEFAULT_INITIAL_SETTINGS = {
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
            logo: '',
            isDefault: true
        }
    ],
    activeProfileId: 'default'
};

/**
 * Transforms a raw legacy invoice into a canonical record for Dexie.js:
 * - Migrates isGST -> IsGST (strict boolean preservation, especially false)
 * - Migrates isIGST -> IsIGST (strictly false when IsGST is false)
 * - Deterministic conflict resolution (canonical property takes precedence if boolean)
 * - Strips all legacy property names
 * - Ensures a collision-resistant unique ID if missing
 *
 * @param {object} raw
 * @returns {object}
 */
export function transformInvoiceForDexie(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const invoice = { ...raw };

    // 1. Resolve IsGST (Strict boolean preservation, especially explicit false)
    let resolvedIsGST = false;
    if (typeof invoice.IsGST === 'boolean') {
        resolvedIsGST = invoice.IsGST;
    } else if (typeof invoice.isGST === 'boolean') {
        resolvedIsGST = invoice.isGST;
    } else if (typeof invoice.isGST === 'string') {
        resolvedIsGST = invoice.isGST.trim().toLowerCase() === 'true';
    } else if (typeof invoice.IsGST === 'string') {
        resolvedIsGST = invoice.IsGST.trim().toLowerCase() === 'true';
    }
    invoice.IsGST = resolvedIsGST;

    // 2. Resolve IsIGST (Invariant: Meaningful ONLY when IsGST is true)
    let resolvedIsIGST = false;
    if (resolvedIsGST) {
        if (typeof invoice.IsIGST === 'boolean') {
            resolvedIsIGST = invoice.IsIGST;
        } else if (typeof invoice.isIGST === 'boolean') {
            resolvedIsIGST = invoice.isIGST;
        } else if (typeof invoice.isIGST === 'string') {
            resolvedIsIGST = invoice.isIGST.trim().toLowerCase() === 'true';
        } else if (typeof invoice.IsIGST === 'string') {
            resolvedIsIGST = invoice.IsIGST.trim().toLowerCase() === 'true';
        }
    }
    invoice.IsIGST = resolvedIsIGST;

    // 3. Ensure ID
    if (invoice.id === null || invoice.id === undefined) {
        invoice.id = generateUniqueInvoiceId();
    }

    // 4. Strict Elimination of Legacy Properties
    delete invoice.isGST;
    delete invoice.isIGST;
    delete invoice.gst;
    delete invoice.GST;
    delete invoice.igst;
    delete invoice.IGST;
    delete invoice.taxEnabled;

    return invoice;
}

/**
 * Safely parses JSON from localStorage or returns null
 */
function safeGetLocalStorage(key) {
    try {
        if (typeof localStorage === 'undefined') return null;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        return null;
    }
}

/**
 * Main database initializer and one-time localStorage-to-Dexie migration runner.
 * Atomically migrates invoices, clients, items, companies, and settings into Dexie.js.
 */
export async function initializeDatabaseAndMigrate() {
    try {
        const isMigrated = typeof localStorage !== 'undefined' && localStorage.getItem(MIGRATION_MARKER) === 'true';

        if (isMigrated) {
            // Already migrated. Ensure database has seed data if completely fresh
            const count = await db.invoices.count();
            if (count === 0) {
                await seedInitialData();
            }
            return { alreadyMigrated: true };
        }

        // Set lock
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(MIGRATION_LOCK, Date.now().toString());
        }

        // 1. Read existing localStorage data
        const rawInvoices = safeGetLocalStorage(LEGACY_INVOICE_KEY);
        const rawClients = safeGetLocalStorage(LEGACY_CLIENT_KEY);
        const rawItems = safeGetLocalStorage(LEGACY_ITEM_KEY);
        const rawSettings = safeGetLocalStorage(LEGACY_SETTINGS_KEY);

        // 2. Transform Invoices with strict GST contract
        let invoicesToInsert = [];
        if (Array.isArray(rawInvoices) && rawInvoices.length > 0) {
            invoicesToInsert = rawInvoices
                .map(inv => transformInvoiceForDexie(inv))
                .filter(inv => inv !== null);
        } else {
            invoicesToInsert = DEFAULT_INITIAL_INVOICES.map(inv => transformInvoiceForDexie(inv));
        }

        // 3. Transform Clients
        let clientsToInsert = [];
        if (Array.isArray(rawClients) && rawClients.length > 0) {
            clientsToInsert = rawClients.filter(c => c && typeof c === 'object' && c.name);
        }

        // 4. Transform Items
        let itemsToInsert = [];
        if (Array.isArray(rawItems) && rawItems.length > 0) {
            itemsToInsert = rawItems.filter(it => it && typeof it === 'object' && it.name);
        }

        // 5. Transform Companies and Settings
        const settingsSource = rawSettings && typeof rawSettings === 'object' ? rawSettings : DEFAULT_INITIAL_SETTINGS;
        const companiesToInsert = (settingsSource.companyProfiles || DEFAULT_INITIAL_SETTINGS.companyProfiles).map(p => ({
            ...p,
            isDefault: p.id === (settingsSource.activeProfileId || 'default')
        }));

        const appSettingsRecord = {
            key: 'app_config',
            value: {
                validation: { ...DEFAULT_INITIAL_SETTINGS.validation, ...settingsSource.validation },
                display: { ...DEFAULT_INITIAL_SETTINGS.display, ...settingsSource.display },
                payment: { ...DEFAULT_INITIAL_SETTINGS.payment, ...settingsSource.payment },
                activeProfileId: settingsSource.activeProfileId || 'default'
            }
        };

        // 6. Execute Atomic Transaction in Dexie
        await db.transaction('rw', [db.invoices, db.clients, db.items, db.companies, db.settings], async () => {
            if (invoicesToInsert.length > 0) {
                await db.invoices.bulkPut(invoicesToInsert);
            }
            if (clientsToInsert.length > 0) {
                await db.clients.bulkPut(clientsToInsert);
            }
            if (itemsToInsert.length > 0) {
                await db.items.bulkPut(itemsToInsert);
            }
            if (companiesToInsert.length > 0) {
                await db.companies.bulkPut(companiesToInsert);
            }
            await db.settings.put(appSettingsRecord);
        });

        // 7. Verify Data Integrity
        const actualInvoiceCount = await db.invoices.count();
        if (actualInvoiceCount < invoicesToInsert.length) {
            throw new Error(`Data integrity verification failed: expected ${invoicesToInsert.length} invoices, found ${actualInvoiceCount}`);
        }

        // 8. Safely backup legacy localStorage and mark completed
        if (typeof localStorage !== 'undefined') {
            const rawInvoicesStr = localStorage.getItem(LEGACY_INVOICE_KEY);
            if (rawInvoicesStr) {
                localStorage.setItem('invoice_app_data_backup_pre_dexie', rawInvoicesStr);
            }
            localStorage.setItem(MIGRATION_MARKER, 'true');
            localStorage.setItem('invoice_app_schema_version', '2');
            localStorage.removeItem(MIGRATION_LOCK);
        }

        return {
            success: true,
            invoicesMigrated: invoicesToInsert.length,
            clientsMigrated: clientsToInsert.length,
            itemsMigrated: itemsToInsert.length
        };
    } catch (error) {
        console.error('Fatal error during Dexie migration:', error);
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(MIGRATION_LOCK);
        }
        throw error;
    }
}

/**
 * Seeds initial data for brand-new users with zero prior storage
 */
async function seedInitialData() {
    await db.transaction('rw', [db.invoices, db.companies, db.settings], async () => {
        await db.invoices.bulkPut(DEFAULT_INITIAL_INVOICES.map(inv => transformInvoiceForDexie(inv)));
        await db.companies.bulkPut(DEFAULT_INITIAL_SETTINGS.companyProfiles.map(p => ({ ...p, isDefault: true })));
        await db.settings.put({
            key: 'app_config',
            value: {
                validation: DEFAULT_INITIAL_SETTINGS.validation,
                display: DEFAULT_INITIAL_SETTINGS.display,
                payment: DEFAULT_INITIAL_SETTINGS.payment,
                activeProfileId: DEFAULT_INITIAL_SETTINGS.activeProfileId
            }
        });
    });
}
