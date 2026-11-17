/**
 * Application Defaults and UI Configuration Constants
 * Centralizes application-wide boolean defaults, pagination rules, and route paths.
 */

export const APP_DEFAULTS = Object.freeze({
    IS_ACTIVE: true,
    IS_DELETED: false,
    DEFAULT_IS_GST: false,
    DEFAULT_IS_IGST: false,
});

export const PAGINATION = Object.freeze({
    DEFAULT_PAGE: 1,
    CLIENTS_PER_PAGE: 12,
    RECENT_INVOICES_LIMIT: 5,
    TOP_ITEMS_LIMIT: 10,
    TOP_CLIENTS_LIMIT: 10,
});

export const CLIENTS_PER_PAGE = PAGINATION.CLIENTS_PER_PAGE;

export const ROUTES = Object.freeze({
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
    YOUR_DETAILS: '/your-details',
});
