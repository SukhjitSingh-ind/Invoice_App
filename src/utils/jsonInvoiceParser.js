import { TEMPLATES } from './templates.js';

/**
 * Validates whether a template ID exists in the application's supported templates.
 * @param {string} templateId
 * @returns {boolean}
 */
export function isValidTemplateId(templateId) {
    if (!templateId || typeof templateId !== 'string') return false;
    return TEMPLATES.some((t) => t.id === templateId.trim());
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
 * Parses and validates raw JSON input into a flexible extracted invoice structure.
 *
 * Requirements:
 * - Detects malformed JSON syntax with descriptive error messages.
 * - Handles partial data, missing optional fields, empty objects, and null values gracefully.
 * - Accommodates unexpected properties without failing.
 * - Normalizes property aliases (e.g. invoiceNumber vs number, client vs recipient, rate vs price).
 *
 * @param {string|object} input - Raw JSON string or parsed object
 * @returns {import('../types/jsonInvoice').ParseResult}
 */
export function parseAndValidateInvoiceJson(input) {
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

    // 1. Invoice Number normalization
    const invoiceNumber = safeString(
        raw.invoiceNumber ?? raw.number ?? raw.invoice_number ?? raw.invNumber ?? ''
    );

    // 2. Date normalization
    const date = safeString(
        raw.date ?? raw.issueDate ?? raw.issue_date ?? raw.invoiceDate ?? raw.invoice_date ?? ''
    );

    const dueDate = safeString(raw.dueDate ?? raw.due_date ?? '');

    // 3. Client / Recipient extraction
    const rawClient = raw.client || raw.recipient || raw.customer || raw.billTo || null;
    let recipient = null;
    let hasClient = false;

    if (rawClient && typeof rawClient === 'object' && !Array.isArray(rawClient)) {
        const clientName = safeString(rawClient.name ?? rawClient.clientName ?? rawClient.customerName ?? '');
        const clientMobile = safeString(rawClient.mobile ?? rawClient.phone ?? rawClient.contact ?? '');
        const clientEmail = safeString(rawClient.email ?? '');
        const clientAddress = safeString(rawClient.address ?? rawClient.billingAddress ?? '');
        const clientGst = safeString(rawClient.gstNumber ?? rawClient.gst ?? rawClient.gstin ?? '').toUpperCase();
        const clientState = safeString(rawClient.state ?? '');

        if (clientName || clientMobile || clientEmail || clientAddress || clientGst || clientState) {
            hasClient = true;
            recipient = {
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

    // 4. Sender / Company extraction (optional)
    const rawSender = raw.sender || raw.company || raw.vendor || null;
    let sender = null;
    if (rawSender && typeof rawSender === 'object' && !Array.isArray(rawSender)) {
        sender = {
            name: safeString(rawSender.name),
            address: safeString(rawSender.address),
            phone: safeString(rawSender.phone ?? rawSender.mobile),
            email: safeString(rawSender.email),
            gstNumber: safeString(rawSender.gstNumber ?? rawSender.gst ?? rawSender.gstin).toUpperCase(),
            state: safeString(rawSender.state)
        };
    }

    // 5. Template extraction & validation
    const rawTemplate = raw.template ?? raw.templateId ?? raw.layoutTemplate ?? null;
    let template = undefined;
    let hasTemplate = false;
    let rawTemplateId = undefined;

    if (rawTemplate !== null && rawTemplate !== undefined) {
        rawTemplateId = safeString(rawTemplate);
        if (rawTemplateId) {
            hasTemplate = true;
            if (isValidTemplateId(rawTemplateId)) {
                template = rawTemplateId;
            } else {
                warnings.push(
                    `Template "${rawTemplateId}" is not a recognized template ID. Default template will be used.`
                );
            }
        }
    }

    // 6. Items normalization
    const rawItems = raw.items ?? raw.lineItems ?? raw.invoiceItems ?? null;
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

                const description = safeString(
                    rawItem.description ?? rawItem.name ?? rawItem.title ?? rawItem.item ?? `Item ${idx + 1}`
                );
                const quantity = safeNumber(rawItem.quantity ?? rawItem.qty ?? rawItem.count, 1);
                const price = safeNumber(
                    rawItem.price ?? rawItem.rate ?? rawItem.unitPrice ?? rawItem.cost ?? rawItem.amount,
                    0
                );
                const hsnSac = safeString(rawItem.hsnSac ?? rawItem.hsn ?? rawItem.sac ?? '');
                const unit = safeString(rawItem.unit ?? 'Pcs');
                const rawGstRate = rawItem.gstRate ?? rawItem.taxRate ?? rawItem.gst;
                const gstRate = rawGstRate !== undefined ? safeNumber(rawGstRate, 18) : 18;

                const itemId = typeof rawItem.id === 'number' && Number.isInteger(rawItem.id) ? rawItem.id : idx + 1;

                items.push({
                    id: itemId,
                    description,
                    quantity: quantity < 0 ? 0 : quantity,
                    price: price < 0 ? 0 : price,
                    hsnSac,
                    unit: unit || 'Pcs',
                    gstRate: gstRate < 0 ? 0 : gstRate
                });
            });
        }
    }

    // 7. GST preferences
    let isGST = undefined;
    if (typeof raw.isGST === 'boolean') {
        isGST = raw.isGST;
    } else if (typeof raw.gst === 'boolean') {
        isGST = raw.gst;
    } else if (typeof raw.taxEnabled === 'boolean') {
        isGST = raw.taxEnabled;
    } else if (items.some((it) => it.hsnSac || (it.gstRate && it.gstRate > 0)) || recipient?.gstNumber || sender?.gstNumber) {
        // Auto-detect if user has GST fields present
        isGST = true;
    }

    const isIGST = typeof raw.isIGST === 'boolean' ? raw.isIGST : typeof raw.igst === 'boolean' ? raw.igst : false;
    const placeOfSupply = safeString(raw.placeOfSupply ?? raw.place_of_supply ?? '');
    const currency = safeString(raw.currency ?? '₹');

    // 8. Notes & Terms
    let notes = safeString(raw.notes ?? raw.note ?? raw.remark ?? '');
    if (dueDate && !notes.includes(dueDate)) {
        notes = notes ? `${notes}\nDue Date: ${dueDate}` : `Due Date: ${dueDate}`;
    }

    const termsAndConditions = safeString(raw.termsAndConditions ?? raw.terms ?? raw.terms_and_conditions ?? '');
    const paymentInfo = safeString(raw.paymentInfo ?? raw.paymentDetails ?? raw.upi ?? '');

    // 9. Bank Details
    const rawBank = raw.bankDetails || raw.bank || null;
    let bankDetails = undefined;
    if (rawBank && typeof rawBank === 'object') {
        bankDetails = {
            bankName: safeString(rawBank.bankName ?? rawBank.name),
            accountNumber: safeString(rawBank.accountNumber ?? rawBank.account),
            ifscCode: safeString(rawBank.ifscCode ?? rawBank.ifsc),
            accountHolder: safeString(rawBank.accountHolder ?? rawBank.holder)
        };
    }

    // 10. Received / Paid Amount
    const received = safeNumber(raw.received ?? raw.paidAmount ?? raw.amountPaid, 0);

    // 11. Discount
    let discountType = 'fixed';
    let discountValue = 0;
    let discountLabel = 'Discount';

    if (raw.discount && typeof raw.discount === 'object') {
        discountType = raw.discount.type === 'percentage' ? 'percentage' : 'fixed';
        discountValue = safeNumber(raw.discount.value, 0);
        discountLabel = safeString(raw.discount.label ?? 'Discount');
    } else if (typeof raw.discount === 'number' || typeof raw.discount === 'string') {
        discountValue = safeNumber(raw.discount, 0);
    } else {
        if (raw.discountType === 'percentage' || raw.discountType === 'fixed') {
            discountType = raw.discountType;
        }
        discountValue = safeNumber(raw.discountValue, 0);
        discountLabel = safeString(raw.discountLabel ?? 'Discount');
    }

    // 12. Customization (colors, image)
    let customization = undefined;
    if (raw.customization && typeof raw.customization === 'object') {
        customization = {
            backgroundColor: safeString(raw.customization.backgroundColor),
            fontColor: safeString(raw.customization.fontColor),
            backgroundImage: safeString(raw.customization.backgroundImage)
        };
    }

    const extractedInvoice = {
        number: invoiceNumber,
        date,
        recipient,
        sender,
        template,
        items,
        isGST,
        isIGST,
        placeOfSupply,
        currency: currency || '₹',
        notes,
        termsAndConditions,
        paymentInfo,
        bankDetails,
        received,
        discountType,
        discountValue,
        discountLabel: discountLabel || 'Discount',
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
 * Invoice Fields:
 * - JSON provided values
 * - Editor defaults for missing values
 *
 * @param {import('../types/jsonInvoice').ResolutionOptions} options
 * @returns {import('../types/jsonInvoice').ResolvedInvoiceResult}
 */
export function resolveInvoiceData({
    extractedData,
    manualClient = null,
    manualTemplateId = null,
    defaultTemplateId = 'default',
    senderProfile = null,
    bankDetailsFallback = null,
    nextInvoiceNumberFallback = ''
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
        // Highest priority: Explicit manual selection
        resolvedRecipient = {
            name: manualClient.name || '',
            mobile: manualClient.mobile || manualClient.phone || '',
            address: manualClient.address || '',
            email: manualClient.email || '',
            gstNumber: (manualClient.gstNumber || '').toUpperCase(),
            state: manualClient.state || ''
        };
        clientSource = 'manual';
    } else if (data.recipient && data.recipient.name) {
        // Fallback: JSON-provided client
        resolvedRecipient = {
            name: data.recipient.name || '',
            mobile: data.recipient.mobile || data.recipient.phone || '',
            address: data.recipient.address || '',
            email: data.recipient.email || '',
            gstNumber: (data.recipient.gstNumber || '').toUpperCase(),
            state: data.recipient.state || ''
        };
        clientSource = 'json';
    }

    // --- TEMPLATE RESOLUTION ---
    let resolvedTemplate = defaultTemplateId || 'default';
    let templateSource = 'default';

    if (manualTemplateId && isValidTemplateId(manualTemplateId)) {
        // Highest priority: Explicit manual selection
        resolvedTemplate = manualTemplateId;
        templateSource = 'manual';
    } else if (data.template && isValidTemplateId(data.template)) {
        // Fallback: JSON-provided valid template
        resolvedTemplate = data.template;
        templateSource = 'json';
    } else {
        // Final fallback: Application default
        resolvedTemplate = defaultTemplateId || 'default';
        templateSource = 'default';
    }

    const templateMeta = TEMPLATES.find((t) => t.id === resolvedTemplate) || TEMPLATES[0];

    // --- SENDER / COMPANY PROFILE ---
    const resolvedSender = {
        name: data.sender?.name || senderProfile?.name || '',
        address: data.sender?.address || senderProfile?.address || '',
        phone: data.sender?.phone || senderProfile?.phone || senderProfile?.mobile || '',
        email: data.sender?.email || senderProfile?.email || '',
        gstNumber: data.sender?.gstNumber || senderProfile?.gstNumber || '',
        state: data.sender?.state || senderProfile?.state || '24-Gujarat'
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
    const rawNum = data.number ?? data.invoiceNumber ?? data.invoice_number;
    const number = rawNum ? String(rawNum) : nextInvoiceNumberFallback || '1';

    const rawDate = data.date ?? data.issueDate ?? data.issue_date ?? data.invoiceDate;
    const date = rawDate ? String(rawDate) : new Date().toISOString().split('T')[0];

    // --- ITEMS ---
    const items = Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((it, idx) => ({
            id: it.id || idx + 1,
            description: it.description || `Item ${idx + 1}`,
            quantity: typeof it.quantity === 'number' ? it.quantity : 1,
            price: typeof it.price === 'number' ? it.price : 0,
            hsnSac: it.hsnSac || '',
            unit: it.unit || 'Pcs',
            gstRate: typeof it.gstRate === 'number' ? it.gstRate : 18
        }))
        : [];

    // --- GST LOGIC ---
    let isGST = false;
    if (typeof data.isGST === 'boolean') {
        isGST = data.isGST;
    } else if (resolvedRecipient.gstNumber || resolvedSender.gstNumber || items.some((it) => it.hsnSac)) {
        isGST = true;
    }

    const resolvedInvoice = {
        id: Date.now(),
        number,
        date,
        sender: resolvedSender,
        recipient: resolvedRecipient,
        placeOfSupply: data.placeOfSupply || '',
        items,
        currency: data.currency || '₹',
        notes: data.notes || '',
        termsAndConditions: data.termsAndConditions || '',
        paymentInfo: data.paymentInfo || '',
        bankDetails: resolvedBankDetails,
        isGST,
        isIGST: Boolean(data.isIGST),
        gstRate: typeof data.gstRate === 'number' ? data.gstRate : 18,
        cgst: typeof data.cgst === 'number' ? data.cgst : 9,
        sgst: typeof data.sgst === 'number' ? data.sgst : 9,
        received: typeof data.received === 'number' ? data.received : 0,
        discountType: data.discountType === 'percentage' ? 'percentage' : 'fixed',
        discountValue: typeof data.discountValue === 'number' ? data.discountValue : 0,
        discountLabel: data.discountLabel || 'Discount',
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
 * @returns {string}
 */
export function getSampleInvoiceJson() {
    return JSON.stringify(
        {
            invoiceNumber: "INV-2026-001",
            issueDate: new Date().toISOString().split('T')[0],
            template: "modern_indigo",
            client: {
                name: "Acme Corporation Ltd",
                email: "billing@acme.com",
                mobile: "9876543210",
                address: "402 Tech Park, SG Highway, Ahmedabad, Gujarat",
                gstNumber: "24AAACA1234A1Z5"
            },
            items: [
                {
                    description: "Full-Stack Web Application Development",
                    quantity: 1,
                    rate: 45000,
                    hsnSac: "998314",
                    gstRate: 18,
                    unit: "Project"
                },
                {
                    description: "Cloud Architecture & Hosting Setup",
                    quantity: 2,
                    rate: 7500,
                    hsnSac: "998315",
                    gstRate: 18,
                    unit: "Month"
                },
                {
                    description: "Annual Maintenance & Support Contract",
                    quantity: 1,
                    rate: 15000,
                    hsnSac: "9987",
                    gstRate: 18,
                    unit: "Year"
                }
            ],
            notes: "Thank you for partnering with us. Please make payments within 15 days of invoice date.",
            termsAndConditions: "1. 100% payment against deliverables.\n2. Invoices overdue past 30 days attract 1.5% monthly interest.",
            isGST: true,
            isIGST: false,
            placeOfSupply: "24-Gujarat",
            discountType: "fixed",
            discountValue: 2000,
            discountLabel: "Early Payment Rebate"
        },
        null,
        2
    );
}
