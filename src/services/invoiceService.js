import { db } from '../db/db.js';
import { getActiveProfile } from './settingsService.js';
import { upsertClient } from './clientService.js';
import { transformInvoiceForDexie, DEFAULT_INITIAL_INVOICES } from './migrationService.js';

export const migrateInvoiceRecord = (inv) => {
    const transformed = transformInvoiceForDexie(inv);
    const wasModified = Object.prototype.hasOwnProperty.call(inv || {}, 'isGST') ||
                        Object.prototype.hasOwnProperty.call(inv || {}, 'isIGST') ||
                        !Object.prototype.hasOwnProperty.call(inv || {}, 'IsGST');
    return { migrated: transformed, wasModified };
};

let cachedInvoices = [];

/**
 * Hydrates invoices cache from Dexie.
 * @returns {Promise<Array>}
 */
export const loadInvoicesFromDb = async () => {
    try {
        const invoices = await db.invoices.toArray();
        cachedInvoices = invoices;
        return invoices;
    } catch (error) {
        console.error('Error loading invoices from Dexie:', error);
        return cachedInvoices;
    }
};

/**
 * Get all invoices (sync from cache, fallback empty)
 * @returns {Array} Array of invoice objects
 */
export const getAllInvoices = () => {
    return cachedInvoices;
};

/**
 * Get all invoices asynchronously directly from Dexie
 * @returns {Promise<Array>}
 */
export const getAllInvoicesAsync = async () => {
    return await loadInvoicesFromDb();
};

/**
 * Get single invoice by ID with type normalization (number or UUID string)
 * @param {number|string} id - Invoice ID
 * @returns {Promise<Object|null>} Invoice object or null if not found
 */
export const getInvoice = async (id) => {
    if (id === null || id === undefined) return null;
    let inv = await db.invoices.get(id);
    if (!inv && typeof id === 'string') {
        const numId = Number(id);
        if (!isNaN(numId)) inv = await db.invoices.get(numId);
    }
    if (!inv) {
        inv = await db.invoices.filter(i => String(i.id) === String(id)).first();
    }
    return inv || null;
};

/**
 * Save an invoice to Dexie.
 * Automatically generates UUID if missing, and auto-upserts client.
 * @param {Object} invoice
 * @returns {Promise<Object>}
 */
export const saveInvoice = async (invoice) => {
    try {
        const toSave = transformInvoiceForDexie(invoice);

        await db.transaction('rw', [db.invoices, db.clients], async () => {
            if (toSave.recipient && toSave.recipient.name) {
                await upsertClient(toSave.recipient);
            }
            await db.invoices.put(toSave);
        });

        await loadInvoicesFromDb();
        return toSave;
    } catch (error) {
        console.error('Error saving invoice to Dexie:', error);
        throw error;
    }
};

/**
 * Delete an invoice from Dexie by ID
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
export const deleteInvoice = async (id) => {
    try {
        const existing = await getInvoice(id);
        const targetId = existing ? existing.id : id;
        await db.invoices.delete(targetId);
        await loadInvoicesFromDb();
        return true;
    } catch (error) {
        console.error('Error deleting invoice from Dexie:', error);
        return false;
    }
};

/**
 * Creates an empty invoice data structure.
 * Guaranteed to default IsGST to false and IsIGST to false.
 * @param {Object} [overrideProfile] - Optional active company profile
 * @returns {Object}
 */
export const createEmptyInvoice = (overrideProfile = null) => {
    const profile = overrideProfile || getActiveProfile();
    const defaults = {
        name: '',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
        bankDetails: {
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            accountHolder: ''
        }
    };

    const sender = profile || defaults;

    return {
        number: '',
        date: new Date().toISOString().split('T')[0],
        sender: {
            name: sender.name || '',
            address: sender.address || '',
            phone: sender.phone || '',
            email: sender.email || '',
            gstNumber: sender.gstNumber || '',
            state: sender.state || '24-Gujarat'
        },
        recipient: {
            name: '',
            mobile: '',
            address: '',
            gstNumber: '',
            state: ''
        },
        placeOfSupply: '',
        items: [],
        currency: '₹',
        notes: '',
        termsAndConditions: '',
        paymentInfo: '',
        bankDetails: {
            bankName: sender.bankDetails?.bankName || '',
            accountNumber: sender.bankDetails?.accountNumber || '',
            ifscCode: sender.bankDetails?.ifscCode || '',
            accountHolder: sender.bankDetails?.accountHolder || ''
        },
        IsGST: false,
        IsIGST: false,
        gstRate: 18,
        cgst: 9,
        sgst: 9,
        received: 0,
        discountType: 'fixed',
        discountValue: 0,
        discountLabel: 'Discount',
        customization: {
            backgroundColor: '',
            fontColor: '',
            backgroundImage: ''
        }
    };
};

/**
 * Calculates next invoice number based on existing records in Dexie
 * @returns {Promise<string>}
 */
export const getNextInvoiceNumber = async () => {
    const invoices = await db.invoices.toArray();
    if (invoices.length === 0) return '1';

    const sorted = [...invoices].sort((a, b) => {
        if (typeof a.id === 'number' && typeof b.id === 'number') {
            return b.id - a.id;
        }
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
    });
    const lastInvoice = sorted[0];
    const lastNumStr = lastInvoice?.number || '';

    const match = lastNumStr.match(/^(.*?)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = parseInt(numStr, 10) + 1;
        const paddedNum = nextNum.toString().padStart(numStr.length, '0');
        return prefix + paddedNum;
    }

    let max = 0;
    invoices.forEach(inv => {
        const m = (inv.number || '').match(/\d+/);
        if (m) {
            const val = parseInt(m[0], 10);
            if (val > max) max = val;
        }
    });

    return (max > 0 ? max + 1 : invoices.length + 1).toString();
};

/**
 * Checks whether an invoice number already exists in Dexie
 * @param {string} number
 * @param {number|string|null} [excludeId]
 * @returns {Promise<boolean>}
 */
export const checkInvoiceNumberExists = async (number, excludeId = null) => {
    const invoices = await db.invoices.toArray();
    const normalize = n => (n || '').trim().toLowerCase();
    const target = normalize(number);

    return invoices.some(inv =>
        normalize(inv.number) === target &&
        (excludeId === null || (inv.id !== excludeId && String(inv.id) !== String(excludeId)))
    );
};

/**
 * Export all invoices to a downloadable JSON backup
 * @returns {Promise<boolean>}
 */
export const exportInvoices = async () => {
    try {
        const invoices = await db.invoices.toArray();
        const dataStr = JSON.stringify(invoices, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `invoices_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error('Error exporting invoices:', error);
        return false;
    }
};

/**
 * Import invoices from a JSON string into Dexie.
 * Applies transformInvoiceForDexie to enforce canonical GST contract.
 * @param {string} jsonData
 * @returns {Promise<object>}
 */
export const importInvoices = async (jsonData) => {
    try {
        const newInvoices = JSON.parse(jsonData);

        if (!Array.isArray(newInvoices)) {
            throw new Error('Invalid data format: Expected an array of invoices');
        }

        let addedCount = 0;
        let updatedCount = 0;

        await db.transaction('rw', db.invoices, async () => {
            for (const rawInv of newInvoices) {
                if (!rawInv || typeof rawInv !== 'object' || !rawInv.number) continue;

                const newInv = transformInvoiceForDexie(rawInv);
                const existing = await getInvoice(newInv.id);

                if (existing) {
                    await db.invoices.put(newInv);
                    updatedCount++;
                } else {
                    await db.invoices.put(newInv);
                    addedCount++;
                }
            }
        });

        await loadInvoicesFromDb();
        return { success: true, added: addedCount, updated: updatedCount };
    } catch (error) {
        console.error('Error importing invoices:', error);
        return { success: false, message: error.message };
    }
};
