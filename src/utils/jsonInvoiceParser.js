import { TEMPLATES } from './templates.js';
import { generateUniqueInvoiceId } from './idGenerator.js';
import {
    DEFAULT_CURRENCY,
    DEFAULT_GST_RATE,
    DEFAULT_CGST_RATE,
    DEFAULT_SGST_RATE,
    DISCOUNT_TYPES,
    DEFAULT_DISCOUNT_TYPE,
    DEFAULT_DISCOUNT_VALUE,
    DEFAULT_DISCOUNT_LABEL,
    DEFAULT_ITEM_UNIT,
    DEFAULT_STATE,
    DEFAULT_INITIAL_INVOICE_NUMBER,
    APP_DEFAULTS
} from '../constants/index.js';

/**
 * Validates whether a template ID exists in the application's supported or custom templates.
 * @param {string|number} templateId
 * @param {Array<object>} [availableTemplates=null]
 * @returns {boolean}
 */
export function isValidTemplateId(templateId, availableTemplates = null) {
    if (templateId === null || templateId === undefined) return false;
    const strId = String(templateId).trim();
    if (!strId) return false;

    // Check built-in templates
    if (TEMPLATES.some((t) => String(t.id) === strId || (t.key && String(t.key) === strId))) {
        return true;
    }

    // Check custom / available templates if supplied
    if (Array.isArray(availableTemplates) && availableTemplates.length > 0) {
        return availableTemplates.some((t) => String(t.id) === strId || (t.key && String(t.key) === strId));
    }

    return false;
}

/**
 * Safely parses a number or returns fallback
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
function safeNumber(val, fallback = 0) {
    if (val === null || val === undefined || val === '') return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
}

/**
 * Safely trims a string or returns empty string
 * @param {any} val
 * @param {string} fallback
 * @returns {string}
 */
function safeString(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    return String(val).trim();
}

/**
 * Safely parses a boolean value strictly from the given key, supporting boolean or string 'true'/'false'.
 * @param {any} val
 * @returns {boolean | undefined}
 */
function parseBoolean(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
    }
    return undefined;
}

/**
 * Parses and validates raw JSON input into a normalized invoice structure.
 * Uses strictly one agreed property name per data concept with no legacy aliases.
 *
 * @param {string|object} input - Raw JSON string or parsed object
 * @param {Array<object>} [availableTemplates=null] - Available built-in and custom templates
 * @returns {import('../types/jsonInvoice').ParseResult}
 */
export function parseAndValidateInvoiceJson(input, availableTemplates = null) {
    const errors = [];
    const warnings = [];

    if (input === null || input === undefined) {
        return {
            success: false,
            rawParsed: null,
            extractedInvoice: null,
            hasClient: false,
            hasTemplate: false,
            errors: ['JSON input is required. Please paste or upload JSON data.'],
            warnings: []
        };
    }

    let raw = null;

    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) {
            return {
                success: false,
                rawParsed: null,
                extractedInvoice: null,
                hasClient: false,
                hasTemplate: false,
                errors: ['JSON input is empty. Please paste or upload a valid JSON file.'],
                warnings: []
            };
        }

        try {
            raw = JSON.parse(trimmed);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                success: false,
                rawParsed: null,
                extractedInvoice: null,
                hasClient: false,
                hasTemplate: false,
                errors: [`Invalid JSON syntax: ${message}`],
                warnings: []
            };
        }
    } else if (typeof input === 'object') {
        raw = input;
    } else {
        return {
            success: false,
            rawParsed: null,
            extractedInvoice: null,
            hasClient: false,
            hasTemplate: false,
            errors: [`Expected JSON object, received ${typeof input}`],
            warnings: []
        };
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {
            success: false,
            rawParsed: null,
            extractedInvoice: null,
            hasClient: false,
            hasTemplate: false,
            errors: [`Root JSON element must be an object (e.g. { ... }), received ${Array.isArray(raw) ? 'Array' : typeof raw}`],
            warnings: []
        };
    }

    // 1. Invoice Number
    const invoiceNumber = safeString(raw.invoiceNumber);

    // 2. Issue Date & Due Date
    const issueDate = safeString(raw.issueDate);
    const dueDate = safeString(raw.dueDate);

    // 3. Client extraction
    const rawClient = raw.client;
    let client = null;
    let hasClient = false;

    if (rawClient && typeof rawClient === 'object' && !Array.isArray(rawClient)) {
        const clientName = safeString(rawClient.name);
        const clientMobile = safeString(rawClient.mobile);
        const clientEmail = safeString(rawClient.email);
        const clientAddress = safeString(rawClient.address);
        const clientGst = safeString(rawClient.gstNumber).toUpperCase();
        const clientState = safeString(rawClient.state);

        if (clientName || clientMobile || clientEmail || clientAddress || clientGst || clientState) {
            hasClient = true;
            client = {
                name: clientName,
                mobile: clientMobile,
                email: clientEmail,
                address: clientAddress,
                gstNumber: clientGst,
                state: clientState
            };
        }
    } else if (rawClient !== null && rawClient !== undefined) {
        warnings.push('Client property is not a valid object. Ignoring client data.');
    }

    // 4. Sender extraction
    const rawSender = raw.sender;
    let sender = null;
    if (rawSender && typeof rawSender === 'object' && !Array.isArray(rawSender)) {
        sender = {
            name: safeString(rawSender.name),
            address: safeString(rawSender.address),
            phone: safeString(rawSender.phone),
            email: safeString(rawSender.email),
            gstNumber: safeString(rawSender.gstNumber).toUpperCase(),
            state: safeString(rawSender.state)
        };
    }

    // 5. Template extraction & validation
    const rawTemplate = raw.template;
    let template = undefined;
    let hasTemplate = false;
    let rawTemplateId = undefined;

    if (rawTemplate !== null && rawTemplate !== undefined) {
        rawTemplateId = safeString(rawTemplate);
        if (rawTemplateId) {
            hasTemplate = true;
            if (isValidTemplateId(rawTemplateId, availableTemplates)) {
                const strId = String(rawTemplateId).trim();
                const matched = (Array.isArray(availableTemplates) ? availableTemplates : []).find(
                    (t) => String(t.id) === strId || (t.key && String(t.key) === strId)
                ) || TEMPLATES.find(
                    (t) => String(t.id) === strId || (t.key && String(t.key) === strId)
                );
                template = matched ? matched.id : rawTemplateId;
            } else {
                warnings.push(
                    `Template "${rawTemplateId}" is not a recognized template ID. Default template will be used.`
                );
            }
        }
    }

    // 6. Items normalization
    const rawItems = raw.items;
    const items = [];

    if (rawItems !== null && rawItems !== undefined) {
        if (!Array.isArray(rawItems)) {
            warnings.push('Items property should be an array of line items. Ignoring items field.');
        } else {
            rawItems.forEach((rawItem, idx) => {
                if (!rawItem || typeof rawItem !== 'object') {
                    warnings.push(`Item at index ${idx} is not an object. Skipping item.`);
                    return;
                }

                const description = safeString(rawItem.description ?? `Item ${idx + 1}`);
                const quantity = safeNumber(rawItem.quantity, 1);
                const price = safeNumber(rawItem.price, 0);
                const hsnSac = safeString(rawItem.hsnSac);
                const unit = safeString(rawItem.unit ?? DEFAULT_ITEM_UNIT);
                const rawGstRate = rawItem.gstRate;
                const gstRate = rawGstRate !== undefined ? safeNumber(rawGstRate, DEFAULT_GST_RATE) : DEFAULT_GST_RATE;
                const itemId = typeof rawItem.id === 'number' && Number.isInteger(rawItem.id) ? rawItem.id : idx + 1;

                items.push({
                    id: itemId,
                    description,
                    quantity: quantity < 0 ? 0 : quantity,
                    price: price < 0 ? 0 : price,
                    hsnSac,
                    unit: unit || DEFAULT_ITEM_UNIT,
                    gstRate: gstRate < 0 ? 0 : gstRate
                });
            });
        }
    }

    // 7. Strict GST & IGST Resolution
    // Default IsGST to false
    const parsedIsGST = parseBoolean(raw.IsGST);
    const IsGST = parsedIsGST !== undefined ? parsedIsGST : APP_DEFAULTS.DEFAULT_IS_GST;

    // Rule: IsIGST is meaningful ONLY when IsGST is true; otherwise always false
    let IsIGST = APP_DEFAULTS.DEFAULT_IS_IGST;
    if (IsGST) {
        const parsedIsIGST = parseBoolean(raw.IsIGST);
        IsIGST = parsedIsIGST !== undefined ? parsedIsIGST : APP_DEFAULTS.DEFAULT_IS_IGST;
    }

    const placeOfSupply = safeString(raw.placeOfSupply);
    const currency = safeString(raw.currency ?? DEFAULT_CURRENCY);

    // 8. Notes & Terms
    let notes = safeString(raw.notes);
    if (dueDate && !notes.includes(dueDate)) {
        notes = notes ? `${notes}\nDue Date: ${dueDate}` : `Due Date: ${dueDate}`;
    }

    const termsAndConditions = safeString(raw.termsAndConditions);
    const paymentInfo = safeString(raw.paymentInfo);

    // 9. Bank Details
    const rawBank = raw.bankDetails;
    let bankDetails = undefined;
    if (rawBank && typeof rawBank === 'object') {
        bankDetails = {
            bankName: safeString(rawBank.bankName),
            accountNumber: safeString(rawBank.accountNumber),
            ifscCode: safeString(rawBank.ifscCode),
            accountHolder: safeString(rawBank.accountHolder)
        };
    }

    // 10. Received Amount
    const received = safeNumber(raw.received, 0);

    // 11. Discount
    let discountType = DEFAULT_DISCOUNT_TYPE;
    let discountValue = DEFAULT_DISCOUNT_VALUE;
    let discountLabel = DEFAULT_DISCOUNT_LABEL;

    if (raw.discountType === DISCOUNT_TYPES.PERCENTAGE || raw.discountType === DISCOUNT_TYPES.FIXED) {
        discountType = raw.discountType;
    }
    discountValue = safeNumber(raw.discountValue, DEFAULT_DISCOUNT_VALUE);
    discountLabel = safeString(raw.discountLabel ?? DEFAULT_DISCOUNT_LABEL);

    // 12. Customization
    let customization = undefined;
    if (raw.customization && typeof raw.customization === 'object') {
        customization = {
            backgroundColor: safeString(raw.customization.backgroundColor),
            fontColor: safeString(raw.customization.fontColor),
            backgroundImage: safeString(raw.customization.backgroundImage)
        };
    }

    const extractedInvoice = {
        invoiceNumber,
        issueDate,
        dueDate: dueDate || undefined,
        client,
        sender,
        template,
        items,
        IsGST,
        IsIGST,
        placeOfSupply,
        currency: currency || DEFAULT_CURRENCY,
        notes,
        termsAndConditions,
        paymentInfo,
        bankDetails,
        received,
        discountType,
        discountValue,
        discountLabel: discountLabel || DEFAULT_DISCOUNT_LABEL,
        customization
    };

    return {
        success: true,
        rawParsed: raw,
        extractedInvoice,
        hasClient,
        hasTemplate,
        rawTemplateId,
        errors,
        warnings
    };
}

/**
 * Resolves the effective invoice data according to the deterministic precedence hierarchy:
 *
 * Client Precedence:
 * 1. Manually selected client (Highest)
 * 2. JSON-provided client (Fallback)
 * 3. Existing application empty client (Final fallback)
 *
 * Template Precedence:
 * 1. Manually selected template (Highest)
 * 2. JSON-provided valid template (Fallback)
 * 3. Application default template ('default') (Final fallback)
 *
 * Tax Architecture:
 * 1. IsGST is the single source of truth for whether GST applies (Default: false).
 *    - manualIsGST override takes highest priority if provided.
 *    - JSON IsGST takes fallback priority.
 *    - Defaults strictly to false if omitted.
 * 2. IsIGST determines Interstate vs Intrastate tax distribution only when IsGST is true.
 *    - If IsGST is false, IsIGST is normalized to false to prevent contradictory states.
 *
 * @param {import('../types/jsonInvoice').ResolutionOptions} options
 * @returns {import('../types/jsonInvoice').ResolvedInvoiceResult}
 */
export function resolveInvoiceData({
    extractedData,
    manualClient = null,
    manualTemplateId = null,
    manualIsGST = null,
    defaultTemplateId = 'default',
    senderProfile = null,
    bankDetailsFallback = null,
    nextInvoiceNumberFallback = '',
    availableTemplates = null
}) {
    const data = extractedData || {};

    // --- CLIENT RESOLUTION ---
    let resolvedRecipient = {
        name: '',
        mobile: '',
        address: '',
        email: '',
        gstNumber: '',
        state: ''
    };
    let clientSource = 'none';

    if (manualClient && manualClient.name) {
        resolvedRecipient = {
            name: manualClient.name || '',
            mobile: manualClient.mobile || '',
            address: manualClient.address || '',
            email: manualClient.email || '',
            gstNumber: (manualClient.gstNumber || '').toUpperCase(),
            state: manualClient.state || ''
        };
        clientSource = 'manual';
    } else if (data.client && data.client.name) {
        resolvedRecipient = {
            name: data.client.name || '',
            mobile: data.client.mobile || '',
            address: data.client.address || '',
            email: data.client.email || '',
            gstNumber: (data.client.gstNumber || '').toUpperCase(),
            state: data.client.state || ''
        };
        clientSource = 'json';
    }

    // --- TEMPLATE RESOLUTION ---
    let resolvedTemplate = defaultTemplateId || 'default';
    let templateSource = 'default';

    if (manualTemplateId && isValidTemplateId(manualTemplateId, availableTemplates)) {
        resolvedTemplate = manualTemplateId;
        templateSource = 'manual';
    } else if (data.template && isValidTemplateId(data.template, availableTemplates)) {
        resolvedTemplate = data.template;
        templateSource = 'json';
    } else {
        resolvedTemplate = defaultTemplateId || 'default';
        templateSource = 'default';
    }

    const templateMeta = (Array.isArray(availableTemplates) ? availableTemplates : []).find(
        (t) => String(t.id) === String(resolvedTemplate) || (t.key && String(t.key) === String(resolvedTemplate))
    ) || TEMPLATES.find((t) => String(t.id) === String(resolvedTemplate)) || TEMPLATES[0];

    // --- SENDER / COMPANY PROFILE ---
    const resolvedSender = {
        name: data.sender?.name || senderProfile?.name || '',
        address: data.sender?.address || senderProfile?.address || '',
        phone: data.sender?.phone || senderProfile?.phone || '',
        email: data.sender?.email || senderProfile?.email || '',
        gstNumber: data.sender?.gstNumber || senderProfile?.gstNumber || '',
        state: data.sender?.state || senderProfile?.state || DEFAULT_STATE
    };

    // --- BANK DETAILS ---
    const resolvedBankDetails = {
        bankName:
            data.bankDetails?.bankName ||
            senderProfile?.bankDetails?.bankName ||
            bankDetailsFallback?.bankName ||
            '',
        accountNumber:
            data.bankDetails?.accountNumber ||
            senderProfile?.bankDetails?.accountNumber ||
            bankDetailsFallback?.accountNumber ||
            '',
        ifscCode:
            data.bankDetails?.ifscCode ||
            senderProfile?.bankDetails?.ifscCode ||
            bankDetailsFallback?.ifscCode ||
            '',
        accountHolder:
            data.bankDetails?.accountHolder ||
            senderProfile?.bankDetails?.accountHolder ||
            bankDetailsFallback?.accountHolder ||
            ''
    };

    // --- INVOICE NUMBER & DATE ---
    const number = data.invoiceNumber ? String(data.invoiceNumber) : nextInvoiceNumberFallback || DEFAULT_INITIAL_INVOICE_NUMBER;
    const date = data.issueDate ? String(data.issueDate) : new Date().toISOString().split('T')[0];

    // --- ITEMS ---
    const items = Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((it, idx) => ({
            id: it.id || idx + 1,
            description: it.description || `Item ${idx + 1}`,
            quantity: typeof it.quantity === 'number' ? it.quantity : 1,
            price: typeof it.price === 'number' ? it.price : 0,
            hsnSac: it.hsnSac || '',
            unit: it.unit || DEFAULT_ITEM_UNIT,
            gstRate: typeof it.gstRate === 'number' ? it.gstRate : DEFAULT_GST_RATE
        }))
        : [];

    // --- GST LOGIC ---
    let IsGST = APP_DEFAULTS.DEFAULT_IS_GST;
    if (typeof manualIsGST === 'boolean') {
        IsGST = manualIsGST;
    } else if (typeof data.IsGST === 'boolean') {
        IsGST = data.IsGST;
    }

    // --- IGST LOGIC ---
    let IsIGST = APP_DEFAULTS.DEFAULT_IS_IGST;
    if (IsGST && typeof data.IsIGST === 'boolean') {
        IsIGST = data.IsIGST;
    }

    const resolvedInvoice = {
        id: (data.id != null) ? data.id : generateUniqueInvoiceId(),
        number,
        date,
        sender: resolvedSender,
        recipient: resolvedRecipient,
        placeOfSupply: data.placeOfSupply || '',
        items,
        currency: data.currency || DEFAULT_CURRENCY,
        notes: data.notes || '',
        termsAndConditions: data.termsAndConditions || '',
        paymentInfo: data.paymentInfo || '',
        bankDetails: resolvedBankDetails,
        IsGST,
        IsIGST,
        gstRate: DEFAULT_GST_RATE,
        cgst: DEFAULT_CGST_RATE,
        sgst: DEFAULT_SGST_RATE,
        received: typeof data.received === 'number' ? data.received : 0,
        discountType: data.discountType === DISCOUNT_TYPES.PERCENTAGE ? DISCOUNT_TYPES.PERCENTAGE : DEFAULT_DISCOUNT_TYPE,
        discountValue: typeof data.discountValue === 'number' ? data.discountValue : DEFAULT_DISCOUNT_VALUE,
        discountLabel: data.discountLabel || DEFAULT_DISCOUNT_LABEL,
        template: resolvedTemplate,
        customization: data.customization || {
            backgroundColor: '',
            fontColor: '',
            backgroundImage: ''
        }
    };

    return {
        invoice: resolvedInvoice,
        clientSource,
        templateSource,
        clientName: resolvedRecipient.name || 'Walk-in Client',
        templateName: templateMeta.name
    };
}

/**
 * Returns a rich, well-formed sample JSON for quick evaluation and testing.
 * Uses strictly one agreed property name per concept.
 * @returns {string}
 */
export function getSampleInvoiceJson() {
    return JSON.stringify(
        {
            invoiceNumber: "INV-2026-001",
            issueDate: new Date().toISOString().split('T')[0],
            template: "modern_indigo",
            IsGST: false,
            IsIGST: false,
            client: {
                name: "Acme Corporation Ltd",
                email: "billing@acme.com",
                mobile: "9876543210",
                address: "402 Tech Park, SG Highway, Ahmedabad, Gujarat",
                gstNumber: "24AAACA1234A1Z5",
                state: "24-Gujarat"
            },
            items: [
                {
                    description: "Full-Stack Web Application Development",
                    quantity: 1,
                    price: 45000,
                    hsnSac: "998314",
                    gstRate: 18,
                    unit: "Project"
                },
                {
                    description: "Cloud Architecture & Hosting Setup",
                    quantity: 2,
                    price: 7500,
                    hsnSac: "998315",
                    gstRate: 18,
                    unit: "Month"
                },
                {
                    description: "Annual Maintenance & Support Contract",
                    quantity: 1,
                    price: 15000,
                    hsnSac: "9987",
                    gstRate: 18,
                    unit: "Year"
                }
            ],
            notes: "Thank you for partnering with us. Please make payments within 15 days of invoice date.",
            termsAndConditions: "1. 100% payment against deliverables.\n2. Invoices overdue past 30 days attract 1.5% monthly interest.",
            placeOfSupply: "24-Gujarat",
            discountType: "fixed",
            discountValue: 2000,
            discountLabel: "Early Payment Rebate"
        },
        null,
        2
    );
}
