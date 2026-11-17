/**
 * Storage and Database Constants
 * Centralizes database configuration, table names, and persistent storage keys.
 */

export const DATABASE_NAME = 'InvoiceAppDB';

export const TABLE_NAMES = Object.freeze({
    INVOICES: 'invoices',
    CLIENTS: 'clients',
    ITEMS: 'items',
    COMPANIES: 'companies',
    SETTINGS: 'settings',
});

export const STORAGE_KEYS = Object.freeze({
    MIGRATION_MARKER: 'invoice_app_dexie_migrated',
    MIGRATION_LOCK: 'invoice_app_migration_lock',
    LEGACY_INVOICE_KEY: 'invoice_app_data',
    LEGACY_CLIENT_KEY: 'invoice_app_clients',
    LEGACY_ITEM_KEY: 'invoice_app_items',
    LEGACY_SETTINGS_KEY: 'invoice_app_settings',
    BACKUP_PRE_DEXIE: 'invoice_app_data_backup_pre_dexie',
    SCHEMA_VERSION: 'invoice_app_schema_version',
    PENDING_IMPORTED_INVOICE: 'pending_imported_invoice',
    APP_CONFIG: 'app_config',
    FULL_BACKUP_TYPE: 'invoice_app_full_backup',
});
