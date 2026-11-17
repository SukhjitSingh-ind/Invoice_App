/**
 * Constants & Route Registry Regression Tests
 * Ensures constants remain defined, frozen, and consistent across refactorings.
 */

import * as constants from './index.js';
import * as clientHelpers from '../utils/clientHelpers.js';
import * as migrationService from '../services/migrationService.js';

console.log('Running Constants & Route Registry Regression Tests...');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        failed++;
    }
}

// =========================================================================
// 1. Constants Immutability & Structure Validation
// =========================================================================

// APP_DEFAULTS
assert(typeof constants.APP_DEFAULTS === 'object' && constants.APP_DEFAULTS !== null, 'APP_DEFAULTS object exists');
assert(Object.isFrozen(constants.APP_DEFAULTS), 'APP_DEFAULTS is immutable (Object.isFrozen)');
assert(constants.APP_DEFAULTS.DEFAULT_PROFILE_ID === 'default', 'APP_DEFAULTS.DEFAULT_PROFILE_ID is "default"');
assert(constants.APP_DEFAULTS.DEFAULT_STATE === '24-Gujarat', 'APP_DEFAULTS.DEFAULT_STATE is "24-Gujarat"');
assert(constants.APP_DEFAULTS.DEFAULT_INITIAL_INVOICE_NUMBER === '1', 'APP_DEFAULTS.DEFAULT_INITIAL_INVOICE_NUMBER is "1"');
assert(constants.APP_DEFAULTS.DEFAULT_IS_GST === false, 'APP_DEFAULTS.DEFAULT_IS_GST is false');
assert(constants.APP_DEFAULTS.DEFAULT_IS_IGST === false, 'APP_DEFAULTS.DEFAULT_IS_IGST is false');

// Dead code removal: IS_ACTIVE and IS_DELETED must not exist
assert(constants.APP_DEFAULTS.IS_ACTIVE === undefined, 'Dead code check: APP_DEFAULTS.IS_ACTIVE is removed');
assert(constants.APP_DEFAULTS.IS_DELETED === undefined, 'Dead code check: APP_DEFAULTS.IS_DELETED is removed');

// PAGINATION
assert(typeof constants.PAGINATION === 'object' && constants.PAGINATION !== null, 'PAGINATION object exists');
assert(Object.isFrozen(constants.PAGINATION), 'PAGINATION is immutable (Object.isFrozen)');
assert(constants.PAGINATION.DEFAULT_PAGE === 1, 'PAGINATION.DEFAULT_PAGE is 1');
assert(constants.PAGINATION.CLIENTS_PER_PAGE === 12, 'PAGINATION.CLIENTS_PER_PAGE is 12');
assert(constants.PAGINATION.RECENT_INVOICES_LIMIT === 5, 'PAGINATION.RECENT_INVOICES_LIMIT is 5');
assert(constants.PAGINATION.TOP_ITEMS_LIMIT === 10, 'PAGINATION.TOP_ITEMS_LIMIT is 10');
assert(constants.PAGINATION.TOP_CLIENTS_LIMIT === 10, 'PAGINATION.TOP_CLIENTS_LIMIT is 10');
assert(constants.CLIENTS_PER_PAGE === 12, 'Canonical CLIENTS_PER_PAGE is 12');

// TOAST_TYPES & DEFAULT_TOAST_DURATION
assert(typeof constants.TOAST_TYPES === 'object' && constants.TOAST_TYPES !== null, 'TOAST_TYPES object exists');
assert(Object.isFrozen(constants.TOAST_TYPES), 'TOAST_TYPES is immutable (Object.isFrozen)');
assert(constants.TOAST_TYPES.SUCCESS === 'success', 'TOAST_TYPES.SUCCESS is "success"');
assert(constants.TOAST_TYPES.ERROR === 'error', 'TOAST_TYPES.ERROR is "error"');
assert(constants.TOAST_TYPES.WARNING === 'warning', 'TOAST_TYPES.WARNING is "warning"');
assert(constants.TOAST_TYPES.INFO === 'info', 'TOAST_TYPES.INFO is "info"');
assert(constants.DEFAULT_TOAST_DURATION === 3000, 'DEFAULT_TOAST_DURATION is 3000ms');

// INVOICE_STATUS & PAYMENT_STATUS
assert(typeof constants.INVOICE_STATUS === 'object' && constants.INVOICE_STATUS !== null, 'INVOICE_STATUS object exists');
assert(Object.isFrozen(constants.INVOICE_STATUS), 'INVOICE_STATUS is immutable (Object.isFrozen)');
assert(constants.INVOICE_STATUS.DRAFT === 'DRAFT', 'INVOICE_STATUS.DRAFT is "DRAFT"');
assert(constants.INVOICE_STATUS.SENT === 'SENT', 'INVOICE_STATUS.SENT is "SENT"');
assert(constants.INVOICE_STATUS.PAID === 'PAID', 'INVOICE_STATUS.PAID is "PAID"');
assert(constants.INVOICE_STATUS.OVERDUE === 'OVERDUE', 'INVOICE_STATUS.OVERDUE is "OVERDUE"');

assert(typeof constants.PAYMENT_STATUS === 'object' && constants.PAYMENT_STATUS !== null, 'PAYMENT_STATUS object exists');
assert(Object.isFrozen(constants.PAYMENT_STATUS), 'PAYMENT_STATUS is immutable (Object.isFrozen)');
assert(constants.PAYMENT_STATUS.PAID === 'Paid', 'PAYMENT_STATUS.PAID is "Paid"');
assert(constants.PAYMENT_STATUS.UNPAID === 'Unpaid', 'PAYMENT_STATUS.UNPAID is "Unpaid"');
assert(constants.PAYMENT_STATUS.FULLY_PAID === 'Fully Paid', 'PAYMENT_STATUS.FULLY_PAID is "Fully Paid"');

// CURRENCY & NUMERICAL FORMATTING
assert(constants.DEFAULT_CURRENCY === '₹', 'DEFAULT_CURRENCY is "₹"');
assert(constants.DEFAULT_CURRENCY_CODE === 'INR', 'DEFAULT_CURRENCY_CODE is "INR"');
assert(constants.DEFAULT_LOCALE === 'en-IN', 'DEFAULT_LOCALE is "en-IN"');
assert(constants.MONEY_DECIMAL_PRECISION === 2, 'MONEY_DECIMAL_PRECISION is 2');
assert(constants.PERCENTAGE_FACTOR === 100, 'PERCENTAGE_FACTOR is 100');
assert(constants.TAX_SPLIT_DIVISOR === 2, 'TAX_SPLIT_DIVISOR is 2');
assert(constants.PAISE_PER_RUPEE === 100, 'PAISE_PER_RUPEE is 100');

// Dead code removal: unused CURRENCY object & SUPPORTED_CURRENCIES
assert(constants.CURRENCY === undefined, 'Dead code check: CURRENCY object is removed');
assert(constants.SUPPORTED_CURRENCIES === undefined, 'Dead code check: SUPPORTED_CURRENCIES is removed');

// TAX & DISCOUNT
assert(constants.DEFAULT_GST_RATE === 18, 'DEFAULT_GST_RATE is 18');
assert(constants.DEFAULT_CGST_RATE === 9, 'DEFAULT_CGST_RATE is 9');
assert(constants.DEFAULT_SGST_RATE === 9, 'DEFAULT_SGST_RATE is 9');
assert(typeof constants.DISCOUNT_TYPES === 'object' && constants.DISCOUNT_TYPES !== null, 'DISCOUNT_TYPES object exists');
assert(Object.isFrozen(constants.DISCOUNT_TYPES), 'DISCOUNT_TYPES is immutable (Object.isFrozen)');
assert(constants.DISCOUNT_TYPES.FIXED === 'fixed', 'DISCOUNT_TYPES.FIXED is "fixed"');
assert(constants.DISCOUNT_TYPES.PERCENTAGE === 'percentage', 'DISCOUNT_TYPES.PERCENTAGE is "percentage"');
assert(constants.DEFAULT_DISCOUNT_TYPE === 'fixed', 'DEFAULT_DISCOUNT_TYPE is "fixed"');
assert(constants.DEFAULT_DISCOUNT_VALUE === 0, 'DEFAULT_DISCOUNT_VALUE is 0');
assert(constants.DEFAULT_DISCOUNT_LABEL === 'Discount', 'DEFAULT_DISCOUNT_LABEL is "Discount"');

// ITEM & FILE DEFAULTS
assert(constants.DEFAULT_ITEM_UNIT === 'Pcs', 'DEFAULT_ITEM_UNIT is "Pcs"');
assert(constants.DEFAULT_TEMPLATE === 'default', 'DEFAULT_TEMPLATE is "default"');
assert(constants.MAX_IMAGE_SIZE_BYTES === 500000, 'MAX_IMAGE_SIZE_BYTES is 500000');
assert(constants.MAX_LOGO_SIZE_BYTES === 5000000, 'MAX_LOGO_SIZE_BYTES is 5000000');

// STORAGE & DATABASE CONSTANTS
assert(constants.DATABASE_NAME === 'InvoiceAppDB', 'DATABASE_NAME is "InvoiceAppDB"');
assert(typeof constants.TABLE_NAMES === 'object' && constants.TABLE_NAMES !== null, 'TABLE_NAMES object exists');
assert(Object.isFrozen(constants.TABLE_NAMES), 'TABLE_NAMES is immutable (Object.isFrozen)');
assert(constants.TABLE_NAMES.INVOICES === 'invoices', 'TABLE_NAMES.INVOICES is "invoices"');
assert(constants.TABLE_NAMES.CLIENTS === 'clients', 'TABLE_NAMES.CLIENTS is "clients"');
assert(constants.TABLE_NAMES.ITEMS === 'items', 'TABLE_NAMES.ITEMS is "items"');
assert(constants.TABLE_NAMES.COMPANIES === 'companies', 'TABLE_NAMES.COMPANIES is "companies"');
assert(constants.TABLE_NAMES.SETTINGS === 'settings', 'TABLE_NAMES.SETTINGS is "settings"');

assert(typeof constants.STORAGE_KEYS === 'object' && constants.STORAGE_KEYS !== null, 'STORAGE_KEYS object exists');
assert(Object.isFrozen(constants.STORAGE_KEYS), 'STORAGE_KEYS is immutable (Object.isFrozen)');
assert(constants.STORAGE_KEYS.MIGRATION_MARKER === 'invoice_app_dexie_migrated', 'STORAGE_KEYS.MIGRATION_MARKER is correct');
assert(constants.STORAGE_KEYS.APP_CONFIG === 'app_config', 'STORAGE_KEYS.APP_CONFIG is "app_config"');
assert(constants.STORAGE_KEYS.FULL_BACKUP_TYPE === 'invoice_app_full_backup', 'STORAGE_KEYS.FULL_BACKUP_TYPE is correct');
assert(constants.STORAGE_KEYS.PENDING_IMPORTED_INVOICE === 'pending_imported_invoice', 'STORAGE_KEYS.PENDING_IMPORTED_INVOICE is correct');

assert(typeof constants.MIME_TYPES === 'object' && constants.MIME_TYPES !== null, 'MIME_TYPES object exists');
assert(Object.isFrozen(constants.MIME_TYPES), 'MIME_TYPES is immutable (Object.isFrozen)');
assert(constants.MIME_TYPES.JSON === 'application/json', 'MIME_TYPES.JSON is "application/json"');

assert(typeof constants.DEXIE_TRANSACTION_MODE === 'object' && constants.DEXIE_TRANSACTION_MODE !== null, 'DEXIE_TRANSACTION_MODE object exists');
assert(Object.isFrozen(constants.DEXIE_TRANSACTION_MODE), 'DEXIE_TRANSACTION_MODE is immutable (Object.isFrozen)');
assert(constants.DEXIE_TRANSACTION_MODE.READ_WRITE === 'rw', 'DEXIE_TRANSACTION_MODE.READ_WRITE is "rw"');

// =========================================================================
// 2. Route Registry Validation
// =========================================================================

assert(typeof constants.ROUTES === 'object' && constants.ROUTES !== null, 'ROUTES object exists');
assert(Object.isFrozen(constants.ROUTES), 'ROUTES is immutable (Object.isFrozen)');

const expectedRoutes = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    INVOICES: '/invoices',
    CLIENTS: '/clients',
    ITEMS: '/items',
    REPORTS: '/reports',
    HELP: '/help',
    CREATE_INVOICE: '/create',
    CREATE_INVOICE_JSON: '/create-json',
    CREATE_FROM_JSON: '/create-from-json',
    EDITOR_NEW: '/editor/new',
    EDIT_INVOICE: '/edit/:id',
    PREVIEW_INVOICE: '/preview/:id',
    SETTINGS: '/settings',
    YOUR_DETAILS: '/your-details'
};

for (const [key, expectedPath] of Object.entries(expectedRoutes)) {
    assert(constants.ROUTES[key] === expectedPath, `ROUTES.${key} matches expected path "${expectedPath}"`);
}

// Verify all route values start with '/' and contain no undefined/null
for (const [key, value] of Object.entries(constants.ROUTES)) {
    assert(typeof value === 'string' && value.startsWith('/'), `Route "${key}" has valid format: "${value}"`);
}

// Dynamic route generators
assert(typeof constants.getEditInvoiceRoute === 'function', 'getEditInvoiceRoute is a function');
assert(constants.getEditInvoiceRoute('inv_123') === '/edit/inv_123', 'getEditInvoiceRoute produces "/edit/inv_123"');
assert(constants.getEditInvoiceRoute(999) === '/edit/999', 'getEditInvoiceRoute produces "/edit/999"');

assert(typeof constants.getPreviewInvoiceRoute === 'function', 'getPreviewInvoiceRoute is a function');
assert(constants.getPreviewInvoiceRoute('inv_456') === '/preview/inv_456', 'getPreviewInvoiceRoute produces "/preview/inv_456"');
assert(constants.getPreviewInvoiceRoute(888) === '/preview/888', 'getPreviewInvoiceRoute produces "/preview/888"');

// =========================================================================
// 3. Single Source of Truth / Duplicate Prevention Validation
// =========================================================================

// clientHelpers must NOT re-export CLIENTS_PER_PAGE
assert(clientHelpers.CLIENTS_PER_PAGE === undefined, 'Single source of truth: clientHelpers does NOT export CLIENTS_PER_PAGE');

// migrationService must NOT re-export duplicate STORAGE_KEYS aliases
assert(migrationService.MIGRATION_MARKER === undefined, 'Single source of truth: migrationService does NOT export MIGRATION_MARKER');
assert(migrationService.LEGACY_INVOICE_KEY === undefined, 'Single source of truth: migrationService does NOT export LEGACY_INVOICE_KEY');
assert(migrationService.LEGACY_CLIENT_KEY === undefined, 'Single source of truth: migrationService does NOT export LEGACY_CLIENT_KEY');
assert(migrationService.LEGACY_ITEM_KEY === undefined, 'Single source of truth: migrationService does NOT export LEGACY_ITEM_KEY');
assert(migrationService.LEGACY_SETTINGS_KEY === undefined, 'Single source of truth: migrationService does NOT export LEGACY_SETTINGS_KEY');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
