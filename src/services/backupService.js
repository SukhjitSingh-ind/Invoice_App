// Centralized full app backup & restore (invoices, clients, items, settings)

const INVOICE_KEY = 'invoice_app_data';
const CLIENT_KEY = 'invoice_app_clients';
const ITEM_KEY = 'invoice_app_items';
const SETTINGS_KEY = 'invoice_app_settings';

function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing key ${key}:`, error);
  }
}

/**
 * Export a single JSON file containing invoices, clients, items and settings.
 */
export function exportFullBackup() {
  try {
    const backup = {
      type: 'invoice_app_full_backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        invoices: safeParse(INVOICE_KEY) || [],
        clients: safeParse(CLIENT_KEY) || [],
        items: safeParse(ITEM_KEY) || [],
        settings: safeParse(SETTINGS_KEY) || null,
      },
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
 * Import a full JSON backup and overwrite current local data.
 * This is destructive for existing data under the known storage keys.
 */
export function importFullBackup(jsonData) {
  try {
    const parsed = JSON.parse(jsonData);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file: not a JSON object');
    }

    if (parsed.type !== 'invoice_app_full_backup') {
      throw new Error('Invalid backup type: this file is not a full app backup');
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Invalid backup file: missing data section');
    }

    const { invoices, clients, items, settings } = parsed.data;

    if (!Array.isArray(invoices)) {
      throw new Error('Invalid backup file: invoices must be an array');
    }
    if (!Array.isArray(clients)) {
      throw new Error('Invalid backup file: clients must be an array');
    }
    if (!Array.isArray(items)) {
      throw new Error('Invalid backup file: items must be an array');
    }

    // Very lightweight schema checks to avoid obviously broken imports
    const safeInvoices = invoices.filter((inv) => inv && (inv.id != null) && typeof inv.number === 'string');
    const safeClients = clients.filter((c) => c && typeof c.name === 'string');
    const safeItems = items.filter((it) => it && typeof it.name === 'string');

    // Apply data (destructive overwrite for known keys)
    safeSet(INVOICE_KEY, safeInvoices);
    safeSet(CLIENT_KEY, safeClients);
    safeSet(ITEM_KEY, safeItems);

    if (settings && typeof settings === 'object') {
      safeSet(SETTINGS_KEY, settings);
    }

    return {
      success: true,
      counts: {
        invoices: safeInvoices.length,
        clients: safeClients.length,
        items: safeItems.length,
      },
    };
  } catch (error) {
    console.error('Error importing full backup:', error);
    return { success: false, message: error.message };
  }
}

