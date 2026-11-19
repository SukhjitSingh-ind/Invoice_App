/**
 * Application Defaults and UI Configuration Constants
 * Centralizes application-wide boolean defaults, pagination rules, and route paths.
 */

export const APP_DEFAULTS = Object.freeze({
    DEFAULT_IS_GST: false,
    DEFAULT_IS_IGST: false,
    DEFAULT_PROFILE_ID: 'default',
    DEFAULT_STATE: '24-Gujarat',
    DEFAULT_INITIAL_INVOICE_NUMBER: '1',
});

export const DEFAULT_IS_GST = APP_DEFAULTS.DEFAULT_IS_GST;
export const DEFAULT_IS_IGST = APP_DEFAULTS.DEFAULT_IS_IGST;
export const DEFAULT_PROFILE_ID = APP_DEFAULTS.DEFAULT_PROFILE_ID;
export const DEFAULT_STATE = APP_DEFAULTS.DEFAULT_STATE;
export const DEFAULT_INITIAL_INVOICE_NUMBER = APP_DEFAULTS.DEFAULT_INITIAL_INVOICE_NUMBER;

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
    TEMPLATE_STUDIO: '/template-studio',
});

export const getEditInvoiceRoute = (id) => `/edit/${id}`;
export const getPreviewInvoiceRoute = (id) => `/preview/${id}`;
export const getTemplateStudioRoute = (id, action) => {
    if (!id) return '/template-studio';
    const params = new URLSearchParams();
    params.set('templateId', String(id));
    if (action) params.set('action', action);
    return `/template-studio?${params.toString()}`;
};

export const TOAST_TYPES = Object.freeze({
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
});

export const DEFAULT_TOAST_DURATION = 3000;
