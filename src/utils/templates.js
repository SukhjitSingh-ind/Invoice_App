import DOMPurify from 'dompurify';
import {
    DEFAULT_TEMPLATE,
    DEFAULT_CURRENCY,
    DEFAULT_LOCALE,
    MONEY_DECIMAL_PRECISION,
    DEFAULT_DISCOUNT_LABEL
} from '../constants/index.js';
import { calculateInvoiceTotals } from './invoiceCalculations.js';
import { numberToWords } from './numberToWords.js';
import { sanitizeCss, sanitizeInlineStyle } from './cssSanitizer.js';

export const TEMPLATES = [
    {
        id: DEFAULT_TEMPLATE,
        name: 'Professional Clean',
        description: 'A clean, modern professional invoice with serif fonts.',
        color: 'blue',
        previewColor: 'bg-blue-600',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'minimal',
        name: 'Minimalist Mono',
        description: 'Simple and stark, using monospaced fonts for a technical look.',
        color: 'slate',
        previewColor: 'bg-slate-800',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'creative',
        name: 'Creative Bold',
        description: 'Bold colors and rounded shapes for creative agencies.',
        color: 'purple',
        previewColor: 'bg-purple-600',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'corporate',
        name: 'Corporate Green',
        description: 'Traditional layout with trustworthy green accents.',
        color: 'emerald',
        previewColor: 'bg-emerald-700',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'modern_indigo',
        name: 'Modern Indigo',
        description: 'Full-width header with a sleek indigo theme.',
        color: 'indigo',
        previewColor: 'bg-indigo-600',
        layout: 'modern',
        paperClass: 'bg-white'
    },
    {
        id: 'retro_warm',
        name: 'Retro Warm',
        description: 'Old-school aesthetic with a warm paper background.',
        color: 'orange',
        previewColor: 'bg-orange-200',
        layout: 'classic',
        paperClass: 'bg-orange-50'
    },
    {
        id: 'dark_mode',
        name: 'Dark Future',
        description: 'High contrast dark mode invoice for digital brands.',
        color: 'slate',
        previewColor: 'bg-slate-900',
        layout: 'classic',
        paperClass: 'bg-slate-900 text-white border-slate-700'
    },
    {
        id: 'luxury_gold',
        name: 'Luxury Gold (Cursive)',
        description: 'Elegant cursive font on dark grey with gold accents.',
        color: 'gold',
        previewColor: 'bg-neutral-900',
        layout: 'modern',
        paperClass: 'bg-neutral-900 text-amber-400 border-neutral-700 custom-font-cursive'
    }
];

export const getTemplateById = (id, customTemplates = []) => {
    if (Array.isArray(customTemplates) && customTemplates.length > 0) {
        const found = customTemplates.find(
            (t) => String(t.id) === String(id) || (t.key && t.key === String(id))
        );
        if (found) return found;
    }
    return TEMPLATES.find((t) => t.id === id || String(t.id) === String(id)) || TEMPLATES[0];
};

/**
 * Normalizes a Dexie custom template record into a consistent selectable template object.
 * Guarantees uniform preview colors, layout badges, and visual metadata across all invoice creation workflows.
 *
 * @param {object} template - Dexie database template record
 * @returns {object|null}
 */
export function formatCustomTemplateForPicker(template) {
    if (!template || typeof template !== 'object') return null;

    const templateId = template.id !== undefined && template.id !== null ? template.id : template.key;
    const templateKey = template.key || (template.id !== undefined && template.id !== null ? `custom_${template.id}` : undefined);

    return {
        id: templateId,
        key: templateKey,
        numericId: typeof template.id === 'number' ? template.id : undefined,
        name: template.name || 'Untitled Custom Template',
        description: template.name ? `Custom uploaded template: ${template.name}` : 'Custom user-uploaded invoice layout',
        color: 'purple',
        previewColor: 'bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-950',
        layout: 'custom',
        paperClass: 'bg-white',
        isCustom: true,
        rawRecord: template,
        html: template.html || '',
        css: template.css || ''
    };
}

/* =========================================================================
   TEMPLATE TOKEN ENGINE & SANITIZER
   ========================================================================= */

const BLOCK_REGEX = /\{\{#([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/**
 * Centralized, immutable base DOMPurify configuration for invoice templates and HTML sanitization.
 * Defines the canonical allowed and forbidden tags/attributes across both full documents and fragments.
 */
export const DEFAULT_DOMPURIFY_CONFIG = Object.freeze({
    ADD_TAGS: Object.freeze(['style']),
    ADD_ATTR: Object.freeze(['target']),
    FORBID_TAGS: Object.freeze(['script', 'iframe', 'object', 'embed', 'base']),
    FORBID_ATTR: Object.freeze(['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'])
});

/**
 * Pre-configured immutable DOMPurify configuration for complete HTML documents.
 */
export const WHOLE_DOCUMENT_PURIFY_CONFIG = Object.freeze({
    ...DEFAULT_DOMPURIFY_CONFIG,
    WHOLE_DOCUMENT: true
});

/**
 * Pre-configured immutable DOMPurify configuration for HTML fragments.
 */
export const FRAGMENT_PURIFY_CONFIG = Object.freeze({
    ...DEFAULT_DOMPURIFY_CONFIG,
    WHOLE_DOCUMENT: false
});

let cachedDomWindow = null;
let cachedPurify = null;
const configuredPurifyInstances = new WeakSet();

/**
 * Registers centralized sanitization hooks onto a DOMPurify instance idempotently.
 * Attaches AST-based CSS sanitizers for `<style>` elements and `style` attributes.
 * Guards against duplicate hook accumulation across repeated calls.
 *
 * @param {import('dompurify').DOMPurifyI} purifyInstance
 * @returns {import('dompurify').DOMPurifyI}
 */
export function registerSanitizationHooks(purifyInstance) {
    if (!purifyInstance || typeof purifyInstance.addHook !== 'function') {
        return purifyInstance;
    }

    if (configuredPurifyInstances.has(purifyInstance)) {
        return purifyInstance;
    }

    purifyInstance.addHook('uponSanitizeElement', (node, data) => {
        if (data.tagName === 'style') {
            const content = node.textContent || '';
            const sanitized = sanitizeCss(content);
            if (!sanitized) {
                node.remove();
            } else {
                node.textContent = sanitized;
            }
        }
    });

    purifyInstance.addHook('uponSanitizeAttribute', (node, data) => {
        if (data.attrName === 'style') {
            const rawStyle = data.attrValue || '';
            const sanitized = sanitizeInlineStyle(rawStyle);
            if (!sanitized) {
                data.keepAttr = false;
            } else {
                data.attrValue = sanitized;
            }
        }
    });

    configuredPurifyInstances.add(purifyInstance);
    return purifyInstance;
}

/**
 * Resolves Node's require function dynamically in server/test environments without static module imports.
 * @returns {Function|null}
 */
function getNodeRequire() {
    try {
        if (typeof globalThis.process !== 'undefined' && typeof globalThis.process.getBuiltinModule === 'function') {
            const mod = globalThis.process.getBuiltinModule('module');
            if (mod && typeof mod.createRequire === 'function') {
                return mod.createRequire(import.meta.url);
            }
        }
    } catch {
        // Ignored in non-Node environments
    }
    return null;
}

/**
 * Resolves a DOM Window instance across browser and Node.js (via JSDOM).
 * @returns {object|null}
 */
function getDomWindow() {
    if (cachedDomWindow) return cachedDomWindow;
    if (typeof window !== 'undefined' && window.document) {
        cachedDomWindow = window;
        return cachedDomWindow;
    }
    if (typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.document) {
        cachedDomWindow = globalThis.window;
        return cachedDomWindow;
    }
    try {
        const req = getNodeRequire();
        if (req) {
            const { JSDOM } = req('jsdom');
            cachedDomWindow = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window;
            return cachedDomWindow;
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Obtains an initialized DOMPurify instance compatible with current runtime.
 * Integrates AST-based CSS sanitization hooks for `<style>` blocks and `style` attributes.
 *
 * @returns {import('dompurify').DOMPurifyI}
 */
export function getPurifyInstance() {
    if (cachedPurify) return cachedPurify;
    const domWindow = getDomWindow();
    if (domWindow) {
        cachedPurify = (typeof DOMPurify.sanitize === 'function' && typeof window !== 'undefined')
            ? DOMPurify
            : DOMPurify(domWindow);
    } else {
        cachedPurify = DOMPurify;
    }

    registerSanitizationHooks(cachedPurify);
    return cachedPurify;
}

/**
 * Resets cached DOMPurify and Window instances for isolated test environments.
 */
export function resetPurifyInstanceForTesting() {
    cachedPurify = null;
    cachedDomWindow = null;
}

/**
 * Creates an HTML Document from a markup string.
 * @param {string} html
 * @returns {Document|null}
 */
function createDocumentFromHtml(html) {
    if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }
    const domWindow = getDomWindow();
    if (domWindow && domWindow.DOMParser) {
        const parser = new domWindow.DOMParser();
        return parser.parseFromString(html, 'text/html');
    }
    return null;
}

/**
 * Detects whether an HTML string represents a complete document (contains DOCTYPE or <html> tags).
 *
 * @param {string} html
 * @returns {boolean}
 */
export function isCompleteHtmlDocument(html) {
    if (!html || typeof html !== 'string') return false;
    return /<!DOCTYPE\b/i.test(html) || /<\s*html\b/i.test(html);
}

/**
 * Sanitizes HTML using centralized DOMPurify configuration and hooks.
 * Both complete documents and HTML fragments use the same centralized security rules.
 * Preserves layout styles while stripping unsafe scripts, styles, and event-handlers.
 *
 * @param {string} html - HTML string to sanitize
 * @param {object} [options={}] - Sanitization options
 * @param {boolean} [options.wholeDocument] - Override auto-detection for whole document vs fragment mode
 * @returns {string} Sanitized markup string
 */
export function sanitizeHtml(html, options = {}) {
    if (!html || typeof html !== 'string') return '';
    const purify = getPurifyInstance();

    const isWholeDoc = options.wholeDocument !== undefined
        ? Boolean(options.wholeDocument)
        : isCompleteHtmlDocument(html);

    // Sanitize with full-document configuration to ensure <style> tags and head structures are preserved
    const sanitized = purify.sanitize(html, WHOLE_DOCUMENT_PURIFY_CONFIG);

    if (isWholeDoc) {
        return sanitized;
    }

    // For HTML fragments, extract <style> blocks and body markup cleanly
    const doc = createDocumentFromHtml(sanitized);
    if (!doc) {
        return purify.sanitize(html, FRAGMENT_PURIFY_CONFIG);
    }

    const styles = Array.from(doc.head.querySelectorAll('style'))
        .map(s => s.outerHTML)
        .join('');
    const bodyContent = doc.body.innerHTML;

    return styles ? `${styles}${bodyContent}` : bodyContent;
}

/**
 * Safely escapes dynamic text values for insertion into HTML markup.
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Formats a monetary number following the application's locale and precision conventions.
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '';
    }
    return value.toLocaleString(DEFAULT_LOCALE, {
        minimumFractionDigits: MONEY_DECIMAL_PRECISION,
        maximumFractionDigits: MONEY_DECIMAL_PRECISION
    });
}

/**
 * Formats a date string or Date object into the established presentation format.
 * @param {Date|string|number} value
 * @returns {string}
 */
function formatDate(value) {
    if (!value) return '';
    if (value instanceof Date) {
        return isNaN(value.getTime())
            ? ''
            : value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
        if (isoMatch) {
            const year = Number(isoMatch[1]);
            const month = Number(isoMatch[2]) - 1;
            const day = Number(isoMatch[3]);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime()) && !/^\d+$/.test(trimmed)) {
            return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        return trimmed;
    }
    return String(value);
}

/**
 * Resolves a nested dot-delimited path from an object safely.
 * @param {object} obj
 * @param {string} path
 * @returns {*}
 */
function getNestedValue(obj, path) {
    if (!obj || typeof obj !== 'object' || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
}

/**
 * Resolves a scalar token against invoice data and computed totals.
 * @param {string} tokenKey
 * @param {object} invoiceData
 * @param {object} computedTotals
 * @returns {string}
 */
function resolveScalarField(tokenKey, invoiceData, computedTotals) {
    switch (tokenKey) {
        case 'currency':
            return invoiceData.currency || DEFAULT_CURRENCY;
        case 'invoiceNumber':
        case 'number':
        case 'invoice.number': {
            const val = invoiceData.invoiceNumber ?? invoiceData.number ?? invoiceData.invoice?.number;
            return val != null ? String(val) : '';
        }
        case 'clientName':
        case 'recipient.name':
        case 'client.name': {
            const val = invoiceData.clientName ?? invoiceData.recipient?.name ?? invoiceData.client?.name ?? invoiceData.recipientName;
            return val != null ? String(val) : '';
        }
        case 'sender.name': {
            const val = invoiceData.sender?.name ?? invoiceData.companyName ?? invoiceData.senderName;
            return val != null ? String(val) : '';
        }
        case 'sender.address':
            return invoiceData.sender?.address != null ? String(invoiceData.sender.address) : '';
        case 'sender.phone':
            return (invoiceData.sender?.phone ?? invoiceData.sender?.mobile) != null
                ? String(invoiceData.sender?.phone ?? invoiceData.sender?.mobile)
                : '';
        case 'sender.email':
            return invoiceData.sender?.email != null ? String(invoiceData.sender.email) : '';
        case 'sender.gstNumber':
            return invoiceData.sender?.gstNumber != null ? String(invoiceData.sender.gstNumber) : '';
        case 'sender.state':
            return invoiceData.sender?.state != null ? String(invoiceData.sender.state) : '';
        case 'recipient.address':
        case 'client.address':
            return (invoiceData.recipient?.address ?? invoiceData.client?.address) != null
                ? String(invoiceData.recipient?.address ?? invoiceData.client?.address)
                : '';
        case 'recipient.mobile':
        case 'client.mobile':
            return (invoiceData.recipient?.mobile ?? invoiceData.client?.mobile ?? invoiceData.recipient?.phone ?? invoiceData.client?.phone) != null
                ? String(invoiceData.recipient?.mobile ?? invoiceData.client?.mobile ?? invoiceData.recipient?.phone ?? invoiceData.client?.phone)
                : '';
        case 'recipient.phone':
            return (invoiceData.recipient?.phone ?? invoiceData.recipient?.mobile ?? invoiceData.client?.phone ?? invoiceData.client?.mobile) != null
                ? String(invoiceData.recipient?.phone ?? invoiceData.recipient?.mobile ?? invoiceData.client?.phone ?? invoiceData.client?.mobile)
                : '';
        case 'recipient.email':
        case 'client.email':
            return (invoiceData.recipient?.email ?? invoiceData.client?.email) != null
                ? String(invoiceData.recipient?.email ?? invoiceData.client?.email)
                : '';
        case 'recipient.gstNumber':
        case 'client.gstNumber':
            return (invoiceData.recipient?.gstNumber ?? invoiceData.client?.gstNumber) != null
                ? String(invoiceData.recipient?.gstNumber ?? invoiceData.client?.gstNumber)
                : '';
        case 'recipient.state':
        case 'client.state':
            return (invoiceData.recipient?.state ?? invoiceData.client?.state) != null
                ? String(invoiceData.recipient?.state ?? invoiceData.client?.state)
                : '';
        case 'date':
        case 'invoice.date':
        case 'issueDate':
            return formatDate(invoiceData.invoice?.date ?? invoiceData.date ?? invoiceData.issueDate);
        case 'dueDate':
        case 'invoice.dueDate':
            return formatDate(invoiceData.invoice?.dueDate ?? invoiceData.dueDate);
        case 'placeOfSupply':
            return invoiceData.placeOfSupply != null ? String(invoiceData.placeOfSupply) : '';
        case 'notes':
            return invoiceData.notes != null ? String(invoiceData.notes) : '';
        case 'termsAndConditions':
        case 'terms':
            return (invoiceData.termsAndConditions ?? invoiceData.terms) != null
                ? String(invoiceData.termsAndConditions ?? invoiceData.terms)
                : '';
        case 'paymentInfo':
            return (invoiceData.paymentInfo ?? invoiceData.payment?.upiId ?? invoiceData.upiId) != null
                ? String(invoiceData.paymentInfo ?? invoiceData.payment?.upiId ?? invoiceData.upiId)
                : '';
        case 'discountLabel':
            return invoiceData.discountLabel != null ? String(invoiceData.discountLabel) : DEFAULT_DISCOUNT_LABEL;
        case 'bankDetails.bankName':
            return (invoiceData.bankDetails?.bankName ?? invoiceData.sender?.bankDetails?.bankName) != null
                ? String(invoiceData.bankDetails?.bankName ?? invoiceData.sender?.bankDetails?.bankName)
                : '';
        case 'bankDetails.accountNumber':
            return (invoiceData.bankDetails?.accountNumber ?? invoiceData.sender?.bankDetails?.accountNumber) != null
                ? String(invoiceData.bankDetails?.accountNumber ?? invoiceData.sender?.bankDetails?.accountNumber)
                : '';
        case 'bankDetails.ifscCode':
            return (invoiceData.bankDetails?.ifscCode ?? invoiceData.sender?.bankDetails?.ifscCode) != null
                ? String(invoiceData.bankDetails?.ifscCode ?? invoiceData.sender?.bankDetails?.ifscCode)
                : '';
        case 'bankDetails.accountHolder':
            return (invoiceData.bankDetails?.accountHolder ?? invoiceData.sender?.bankDetails?.accountHolder) != null
                ? String(invoiceData.bankDetails?.accountHolder ?? invoiceData.sender?.bankDetails?.accountHolder)
                : '';

        // Totals fields
        case 'total':
        case 'totals.total': {
            const raw = invoiceData.totals?.total ?? invoiceData.total ?? computedTotals?.total;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'subtotal':
        case 'totals.subtotal': {
            const raw = invoiceData.totals?.subtotal ?? invoiceData.subtotal ?? computedTotals?.subtotal;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'taxAmount':
        case 'totals.taxAmount': {
            const raw = invoiceData.totals?.taxAmount ?? invoiceData.taxAmount ?? computedTotals?.taxAmount;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'cgstAmount':
        case 'totals.cgstAmount': {
            const raw = invoiceData.totals?.cgstAmount ?? invoiceData.cgstAmount ?? computedTotals?.cgstAmount;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'sgstAmount':
        case 'totals.sgstAmount': {
            const raw = invoiceData.totals?.sgstAmount ?? invoiceData.sgstAmount ?? computedTotals?.sgstAmount;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'igstAmount':
        case 'totals.igstAmount': {
            const raw = invoiceData.totals?.igstAmount ?? invoiceData.igstAmount ?? computedTotals?.igstAmount;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'discountAmount':
        case 'totals.discountAmount': {
            const raw = invoiceData.totals?.discountAmount ?? invoiceData.discountAmount ?? computedTotals?.discountAmount;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'balance':
        case 'totals.balance': {
            const raw = invoiceData.totals?.balance ?? invoiceData.balance ?? computedTotals?.balance;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'received':
        case 'totals.received': {
            const raw = invoiceData.totals?.received ?? invoiceData.received ?? computedTotals?.received;
            return typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
        }
        case 'totalInWords':
        case 'totals.totalInWords': {
            if (invoiceData.totals?.totalInWords) return String(invoiceData.totals.totalInWords);
            if (invoiceData.totalInWords) return String(invoiceData.totalInWords);
            if (computedTotals?.totalInWords) return String(computedTotals.totalInWords);
            const rawTot = invoiceData.totals?.total ?? invoiceData.total ?? computedTotals?.total;
            if (typeof rawTot === 'number' && !isNaN(rawTot)) {
                return numberToWords(rawTot);
            }
            return '';
        }
        default: {
            const val = getNestedValue(invoiceData, tokenKey);
            if (val == null) return '';
            if (typeof val === 'number') {
                const leaf = tokenKey.split('.').pop() || '';
                const isMoney = ['price', 'unitPrice', 'rate', 'total', 'amount', 'subtotal', 'balance', 'received', 'taxAmount', 'discountAmount'].includes(leaf);
                return isMoney ? formatCurrency(val) : String(val);
            }
            if (val instanceof Date) {
                return formatDate(val);
            }
            return String(val);
        }
    }
}

/**
 * Renders a single line item into the repeating block template.
 * @param {string} blockContent
 * @param {object} item
 * @param {number} index
 * @param {object} invoiceData
 * @param {object} computedTotals
 * @returns {string}
 */
function renderItemBlock(blockContent, item, index, invoiceData, computedTotals) {
    return blockContent.replace(TOKEN_REGEX, (match, tokenKey) => {
        const key = tokenKey.trim();
        let val;
        switch (key) {
            case 'index':
                val = String(index + 1);
                break;
            case 'description':
            case 'name':
                val = item.description ?? item.name ?? '';
                break;
            case 'quantity':
            case 'qty': {
                const rawQty = item.quantity ?? item.qty;
                val = rawQty != null ? String(rawQty) : '';
                break;
            }
            case 'unitPrice':
            case 'price':
            case 'rate': {
                const raw = item.unitPrice ?? item.price ?? item.rate;
                val = typeof raw === 'number' ? formatCurrency(raw) : (raw != null ? String(raw) : '');
                break;
            }
            case 'amount':
            case 'total': {
                const raw = item.amount ?? item.total;
                if (typeof raw === 'number') {
                    val = formatCurrency(raw);
                } else if (raw != null) {
                    val = String(raw);
                } else if (item.quantity != null && (item.price != null || item.unitPrice != null)) {
                    val = formatCurrency(Number(item.quantity) * Number(item.price ?? item.unitPrice));
                } else {
                    val = '';
                }
                break;
            }
            case 'unit':
                val = item.unit != null ? String(item.unit) : '';
                break;
            case 'hsnSac':
            case 'hsn':
                val = (item.hsnSac ?? item.hsn) != null ? String(item.hsnSac ?? item.hsn) : '';
                break;
            case 'gstRate':
                val = item.gstRate != null ? String(item.gstRate) : '';
                break;
            default: {
                if (item[key] !== undefined && item[key] !== null) {
                    const raw = item[key];
                    const isMoney = ['price', 'unitPrice', 'rate', 'total', 'amount'].includes(key);
                    val = (typeof raw === 'number' && isMoney) ? formatCurrency(raw) : String(raw);
                } else {
                    val = resolveScalarField(key, invoiceData, computedTotals);
                }
                break;
            }
        }
        return escapeHtml(val);
    });
}

/**
 * Pure template-rendering utility for invoice HTML templates.
 * Replaces scalar tokens, processes repeating line-item blocks,
 * formats values consistently, and sanitizes output HTML using DOMPurify.
 *
 * @param {string} htmlString - Raw HTML template containing tokens
 * @param {object} invoiceData - Invoice data object
 * @returns {string} Sanitized, fully-rendered HTML string
 */
export function renderInvoiceTemplate(htmlString, invoiceData) {
    if (htmlString == null || typeof htmlString !== 'string') {
        return '';
    }

    const data = (invoiceData && typeof invoiceData === 'object') ? invoiceData : {};

    const rawItems = Array.isArray(data.items)
        ? data.items
        : (Array.isArray(data.lineItems) ? data.lineItems : []);

    const computedTotals = calculateInvoiceTotals({ ...data, items: rawItems });
    const effectiveTotal = data.totals?.total ?? data.total ?? computedTotals.total;
    if (typeof effectiveTotal === 'number' && !isNaN(effectiveTotal)) {
        computedTotals.totalInWords = numberToWords(effectiveTotal);
    }

    // 1. Process repeating blocks
    const renderedBlocks = htmlString.replace(BLOCK_REGEX, (match, blockName, blockContent) => {
        let itemsArray = null;
        if (Array.isArray(data[blockName])) {
            itemsArray = data[blockName];
        } else if (blockName === 'lineItems' && Array.isArray(data.items)) {
            itemsArray = data.items;
        } else if (blockName === 'items' && Array.isArray(data.lineItems)) {
            itemsArray = data.lineItems;
        }

        if (!itemsArray || itemsArray.length === 0) {
            return '';
        }

        return itemsArray.map((item, index) => {
            if (!item || typeof item !== 'object') return '';
            return renderItemBlock(blockContent, item, index, data, computedTotals);
        }).join('');
    });

    // 2. Process scalar tokens
    const renderedScalars = renderedBlocks.replace(TOKEN_REGEX, (match, tokenKey) => {
        const rawValue = resolveScalarField(tokenKey.trim(), data, computedTotals);
        return escapeHtml(rawValue);
    });

    // 3. Sanitize final HTML using DOMPurify
    return sanitizeHtml(renderedScalars);
}

export { sanitizeCss, sanitizeInlineStyle } from './cssSanitizer.js';

