/**
 * Template Validator & Token Analysis Utility
 *
 * Provides file verification, HTML structure validation, token detection,
 * duplicate naming checks, and sample invoice data for template previews.
 */

import { renderInvoiceTemplate } from './templates.js';

/**
 * Complete list of supported template token identifiers in renderInvoiceTemplate.
 */
export const SUPPORTED_TEMPLATE_TOKENS = Object.freeze(new Set([
    // Block identifiers
    'items',
    'lineItems',

    // Item line tokens
    'index',
    'description',
    'name',
    'quantity',
    'qty',
    'unitPrice',
    'price',
    'rate',
    'amount',
    'total',
    'unit',
    'hsnSac',
    'hsn',
    'gstRate',

    // Currency & general metadata
    'currency',
    'invoiceNumber',
    'number',
    'invoice.number',
    'date',
    'invoice.date',
    'issueDate',
    'dueDate',
    'invoice.dueDate',
    'placeOfSupply',
    'notes',
    'termsAndConditions',
    'terms',
    'paymentInfo',
    'discountLabel',

    // Sender details
    'sender.name',
    'sender.address',
    'sender.phone',
    'sender.mobile',
    'sender.email',
    'sender.gstNumber',
    'sender.state',
    'companyName',
    'senderName',

    // Recipient details
    'clientName',
    'recipient.name',
    'client.name',
    'recipientName',
    'recipient.address',
    'client.address',
    'recipient.mobile',
    'client.mobile',
    'recipient.phone',
    'client.phone',
    'recipient.email',
    'client.email',
    'recipient.gstNumber',
    'client.gstNumber',
    'recipient.state',
    'client.state',

    // Bank details
    'bankDetails.bankName',
    'bankDetails.accountNumber',
    'bankDetails.ifscCode',
    'bankDetails.accountHolder',

    // Totals and summaries
    'subtotal',
    'totals.subtotal',
    'taxAmount',
    'totals.taxAmount',
    'cgstAmount',
    'totals.cgstAmount',
    'sgstAmount',
    'totals.sgstAmount',
    'igstAmount',
    'totals.igstAmount',
    'discountAmount',
    'totals.discountAmount',
    'total',
    'totals.total',
    'balance',
    'totals.balance',
    'received',
    'totals.received',
    'totalInWords',
    'totals.totalInWords'
]));

/**
 * Rich, comprehensive sample invoice data for rendering accurate template previews.
 */
export const SAMPLE_INVOICE_DATA = Object.freeze({
    number: 'INV-2026-001',
    invoiceNumber: 'INV-2026-001',
    invoice: {
        number: 'INV-2026-001',
        date: '2026-11-19',
        dueDate: '2026-12-05'
    },
    date: '2026-11-19',
    issueDate: '2026-11-19',
    dueDate: '2026-12-05',
    placeOfSupply: '24-Gujarat',
    currency: '₹',
    sender: {
        name: 'Apex Solutions Pvt Ltd',
        address: '101 Tech Boulevard, Gandhinagar, Gujarat 382010',
        phone: '+91 98765 43210',
        mobile: '+91 98765 43210',
        email: 'billing@apexsolutions.com',
        gstNumber: '24AAAAA0000A1Z5',
        state: '24-Gujarat'
    },
    companyName: 'Apex Solutions Pvt Ltd',
    senderName: 'Apex Solutions Pvt Ltd',
    recipient: {
        name: 'Global Enterprises Ltd',
        address: '402 Commerce Park, SG Highway, Ahmedabad, Gujarat 380054',
        mobile: '+91 91234 56780',
        phone: '+91 91234 56780',
        email: 'accounts@globalenterprises.com',
        gstNumber: '24BBBBB1111B1Z2',
        state: '24-Gujarat'
    },
    clientName: 'Global Enterprises Ltd',
    recipientName: 'Global Enterprises Ltd',
    items: [
        {
            index: 1,
            description: 'Web Application Architecture & Development',
            name: 'Web Application Architecture',
            quantity: 1,
            qty: 1,
            price: 45000,
            unitPrice: 45000,
            rate: 45000,
            amount: 45000,
            total: 45000,
            unit: 'Project',
            hsnSac: '998314',
            hsn: '998314',
            gstRate: 18
        },
        {
            index: 2,
            description: 'Cloud Infrastructure Setup & Security Tuning',
            name: 'Cloud Setup',
            quantity: 2,
            qty: 2,
            price: 7500,
            unitPrice: 7500,
            rate: 7500,
            amount: 15000,
            total: 15000,
            unit: 'Month',
            hsnSac: '998315',
            hsn: '998315',
            gstRate: 18
        }
    ],
    bankDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0000123',
        accountHolder: 'Apex Solutions Pvt Ltd'
    },
    notes: 'Thank you for your business. Please make payments within 15 days of invoice date.',
    termsAndConditions: '1. 100% payment against deliverables.\n2. Invoices overdue past 30 days attract 1.5% monthly interest.',
    paymentInfo: 'UPI ID: apexsolutions@okaxis',
    discountLabel: 'Early Payment Rebate',
    discountType: 'fixed',
    discountValue: 2000,
    subtotal: 60000,
    taxAmount: 10800,
    cgstAmount: 5400,
    sgstAmount: 5400,
    igstAmount: 0,
    discountAmount: 2000,
    total: 68800,
    balance: 68800,
    received: 0,
    totalInWords: 'Sixty-Eight Thousand Eight Hundred Rupees Only',
    totals: {
        subtotal: 60000,
        taxAmount: 10800,
        cgstAmount: 5400,
        sgstAmount: 5400,
        igstAmount: 0,
        discountAmount: 2000,
        total: 68800,
        balance: 68800,
        received: 0,
        totalInWords: 'Sixty-Eight Thousand Eight Hundred Rupees Only'
    }
});

/**
 * Validates a local template file object.
 * Checks for presence and supported file extension (.html or .htm).
 *
 * @param {File|Blob|object} file
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateTemplateFile(file) {
    if (!file || typeof file !== 'object') {
        return {
            valid: false,
            error: 'No file selected. Please choose an HTML template file.'
        };
    }

    const fileName = typeof file.name === 'string' ? file.name.trim() : '';
    if (!fileName) {
        return {
            valid: false,
            error: 'Invalid file name. Please upload a valid .html or .htm file.'
        };
    }

    const lowerName = fileName.toLowerCase();
    const hasValidExtension = lowerName.endsWith('.html') || lowerName.endsWith('.htm');

    if (!hasValidExtension) {
        return {
            valid: false,
            error: 'Unsupported file type. Only .html and .htm template files are accepted.'
        };
    }

    return {
        valid: true,
        error: null
    };
}

/**
 * Reads a local HTML file using the browser's FileReader API.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>} Raw HTML string
 */
export function readTemplateFileAsync(file) {
    return new Promise((resolve, reject) => {
        const fileCheck = validateTemplateFile(file);
        if (!fileCheck.valid) {
            reject(new Error(fileCheck.error));
            return;
        }

        if (typeof FileReader === 'undefined') {
            reject(new Error('FileReader API is not supported in this environment.'));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                reject(new Error('Failed to read file as text content.'));
            }
        };

        reader.onerror = () => {
            reject(new Error(reader.error ? reader.error.message : 'Error occurred while reading the file.'));
        };

        reader.onabort = () => {
            reject(new Error('File reading was aborted.'));
        };

        reader.readAsText(file);
    });
}

/**
 * Validates raw HTML markup content.
 * Rejects empty or whitespace-only strings and verifies HTML structure.
 *
 * @param {string} htmlContent
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateTemplateHtml(htmlContent) {
    if (htmlContent == null || typeof htmlContent !== 'string') {
        return {
            valid: false,
            error: 'Template content is empty or invalid.'
        };
    }

    const trimmed = htmlContent.trim();
    if (!trimmed) {
        return {
            valid: false,
            error: 'The uploaded file is empty or contains only whitespace.'
        };
    }

    // Basic structural check: Must contain at least some HTML elements or structural tags
    const hasHtmlTags = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/i.test(trimmed);
    if (!hasHtmlTags) {
        return {
            valid: false,
            error: 'The uploaded file does not contain valid HTML markup.'
        };
    }

    return {
        valid: true,
        error: null
    };
}

/**
 * Scans an HTML template string for recognized invoice tokens.
 * Categorizes tokens into recognized and unrecognized, and returns a warning if none are detected.
 *
 * @param {string} htmlContent
 * @returns {{
 *   tokensFound: string[],
 *   recognizedTokens: string[],
 *   unrecognizedTokens: string[],
 *   hasRecognizedTokens: boolean,
 *   warning: string | null
 * }}
 */
export function detectTemplateTokens(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
        return {
            tokensFound: [],
            recognizedTokens: [],
            unrecognizedTokens: [],
            hasRecognizedTokens: false,
            warning: 'No recognized invoice tokens detected (e.g. {{invoiceNumber}}, {{recipient.name}}, {{#items}}).'
        };
    }

    // Match both scalar tokens {{key}} and block tags {{#key}} or {{/key}}
    const TOKEN_REGEX = /\{\{\s*([#^/]?\s*([a-zA-Z0-9_.]+))\s*\}\}/g;
    const foundSet = new Set();
    let match;

    while ((match = TOKEN_REGEX.exec(htmlContent)) !== null) {
        const rawToken = match[2];
        if (rawToken) {
            foundSet.add(rawToken);
        }
    }

    const tokensFound = Array.from(foundSet);
    const recognizedTokens = [];
    const unrecognizedTokens = [];

    for (const token of tokensFound) {
        if (SUPPORTED_TEMPLATE_TOKENS.has(token)) {
            recognizedTokens.push(token);
        } else {
            // Also recognize nested custom tokens like totals.*, sender.*, recipient.*
            const prefix = token.split('.')[0];
            if (['sender', 'recipient', 'client', 'totals', 'bankDetails', 'invoice'].includes(prefix)) {
                recognizedTokens.push(token);
            } else {
                unrecognizedTokens.push(token);
            }
        }
    }

    const hasRecognizedTokens = recognizedTokens.length > 0;
    const warning = hasRecognizedTokens
        ? null
        : 'Warning: No recognized invoice tokens (e.g. {{invoiceNumber}}, {{recipient.name}}, {{#items}}) were detected. The template will render with static content only.';

    return {
        tokensFound,
        recognizedTokens,
        unrecognizedTokens,
        hasRecognizedTokens,
        warning
    };
}

/**
 * Validates a template name and checks for duplicate names against existing templates.
 *
 * @param {string} name
 * @param {Array<{ id?: number|string, name: string }>} [existingTemplates=[]]
 * @param {number|string|null} [currentTemplateId=null] - ID to ignore when checking duplicates (for updates)
 * @returns {{ valid: boolean, trimmedName: string, error: string | null }}
 */
export function validateTemplateName(name, existingTemplates = [], currentTemplateId = null) {
    if (name == null || typeof name !== 'string') {
        return {
            valid: false,
            trimmedName: '',
            error: 'Template name is required.'
        };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
        return {
            valid: false,
            trimmedName: '',
            error: 'Template name cannot be empty or only whitespace.'
        };
    }

    if (Array.isArray(existingTemplates) && existingTemplates.length > 0) {
        const isDuplicate = existingTemplates.some(t => {
            if (!t || typeof t.name !== 'string') return false;
            // Ignore current template when updating
            if (currentTemplateId != null && String(t.id) === String(currentTemplateId)) {
                return false;
            }
            return t.name.trim().toLowerCase() === trimmedName.toLowerCase();
        });

        if (isDuplicate) {
            return {
                valid: false,
                trimmedName,
                error: `A template named "${trimmedName}" already exists. Please choose a unique name.`
            };
        }
    }

    return {
        valid: true,
        trimmedName,
        error: null
    };
}

/**
 * Generates a sanitized live preview of an uploaded template using sample invoice data.
 *
 * @param {string} rawHtml
 * @param {object} [customSampleData]
 * @returns {string} Sanitized preview HTML
 */
export function previewUploadedTemplate(rawHtml, customSampleData = null) {
    const data = customSampleData || SAMPLE_INVOICE_DATA;
    return renderInvoiceTemplate(rawHtml, data);
}
