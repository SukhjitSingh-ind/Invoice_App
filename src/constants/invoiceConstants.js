/**
 * Invoice Domain Constants
 * Centralizes invoice statuses, currencies, tax rates, discount configurations, and default item parameters.
 */

export const INVOICE_STATUS = Object.freeze({
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
});

export const PAYMENT_STATUS = Object.freeze({
    PAID: 'Paid',
    UNPAID: 'Unpaid',
});

export const CURRENCY = Object.freeze({
    INR: 'INR',
    SYMBOL_INR: '₹',
});

export const SUPPORTED_CURRENCIES = Object.freeze(['INR']);

export const DEFAULT_CURRENCY = '₹';
export const DEFAULT_CURRENCY_CODE = 'INR';
export const DEFAULT_LOCALE = 'en-IN';

export const DEFAULT_GST_RATE = 18;
export const DEFAULT_CGST_RATE = 9;
export const DEFAULT_SGST_RATE = 9;

export const DISCOUNT_TYPES = Object.freeze({
    FIXED: 'fixed',
    PERCENTAGE: 'percentage',
});

export const DEFAULT_DISCOUNT_TYPE = 'fixed';
export const DEFAULT_DISCOUNT_VALUE = 0;
export const DEFAULT_DISCOUNT_LABEL = 'Discount';

export const DEFAULT_ITEM_UNIT = 'Pcs';
export const DEFAULT_TEMPLATE = 'default';

export const MAX_IMAGE_SIZE_BYTES = 500000;
