import {
    parseAndValidateInvoiceJson,
    resolveInvoiceData,
    isValidTemplateId,
    getSampleInvoiceJson
} from './jsonInvoiceParser.js';
import { calculateInvoiceTotals } from './invoiceCalculations.js';

console.log('Running JSON Invoice Parser Tests (Single Agreed Property Names)...');

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

// ==========================================
// 1. JSON INPUT & PARSING TESTS
// ==========================================

// Test 1: Empty / Null / Whitespace input
const emptyResult1 = parseAndValidateInvoiceJson('');
assert(emptyResult1.success === false, 'Empty string should fail parsing');
assert(emptyResult1.errors.length > 0, 'Empty string should provide descriptive error');

const emptyResult2 = parseAndValidateInvoiceJson('   \n  \t ');
assert(emptyResult2.success === false, 'Whitespace-only string should fail parsing');

const nullResult = parseAndValidateInvoiceJson(null);
assert(nullResult.success === false, 'Null input should fail gracefully');

// Test 2: Invalid JSON syntax
const malformedJson = '{\n  "invoiceNumber": "INV-001",\n  "client": {\n}'; // missing closing brace
const malformedResult = parseAndValidateInvoiceJson(malformedJson);
assert(malformedResult.success === false, 'Malformed JSON should fail with syntax error');
assert(malformedResult.errors[0].includes('syntax'), 'Error message should mention syntax error');

// Test 3: Root element is an array or primitive
const arrayResult = parseAndValidateInvoiceJson('[{"invoiceNumber": "INV-1"}]');
assert(arrayResult.success === false, 'Array root should fail (expected object)');

const numberResult = parseAndValidateInvoiceJson('42');
assert(numberResult.success === false, 'Primitive number root should fail');

// Test 4: Valid complete JSON
const sampleJson = getSampleInvoiceJson();
const validResult = parseAndValidateInvoiceJson(sampleJson);
assert(validResult.success === true, 'Sample JSON should parse successfully');
assert(validResult.extractedInvoice.invoiceNumber === 'INV-2026-001', 'Extracted invoice number matches');
assert(validResult.extractedInvoice.client.name === 'Acme Corporation Ltd', 'Extracted client name matches');
assert(validResult.extractedInvoice.items.length === 3, 'Extracted 3 line items');
assert(validResult.extractedInvoice.template === 'modern_indigo', 'Extracted valid template');
assert(validResult.hasClient === true, 'hasClient flag is true');
assert(validResult.hasTemplate === true, 'hasTemplate flag is true');

// Test 5: Valid partial JSON (minimal)
const minimalJson = JSON.stringify({
    items: [
        { description: 'Consulting', price: 5000 }
    ]
});
const partialResult = parseAndValidateInvoiceJson(minimalJson);
assert(partialResult.success === true, 'Minimal partial JSON parses successfully');
assert(partialResult.extractedInvoice.items.length === 1, 'Extracted 1 item from partial JSON');
assert(partialResult.extractedInvoice.items[0].price === 5000, 'Price parsed correctly');
assert(partialResult.extractedInvoice.items[0].quantity === 1, 'Defaulted quantity to 1');
assert(partialResult.hasClient === false, 'hasClient is false for minimal JSON');
assert(partialResult.hasTemplate === false, 'hasTemplate is false for minimal JSON');

// Test 6: Unexpected / Extra fields in JSON are safely tolerated
const extraFieldsJson = JSON.stringify({
    invoiceNumber: 'INV-99',
    arbitraryField: { foo: 'bar', baz: [1, 2, 3] },
    anotherRandomNumber: 9999,
    items: [{ description: 'Service A', quantity: 2, price: 150 }]
});
const extraResult = parseAndValidateInvoiceJson(extraFieldsJson);
assert(extraResult.success === true, 'JSON with unknown properties parses without error');
assert(extraResult.extractedInvoice.invoiceNumber === 'INV-99', 'Known fields extracted accurately');
assert(extraResult.extractedInvoice.items[0].description === 'Service A', 'Item description extracted');
assert(extraResult.extractedInvoice.items[0].quantity === 2, 'Item quantity extracted');
assert(extraResult.extractedInvoice.items[0].price === 150, 'Item price extracted');

// Test 7: Invalid field types handled without crashing
const weirdTypesJson = JSON.stringify({
    invoiceNumber: 12345, // number instead of string
    client: 'Not an object', // string instead of object
    items: 'Not an array', // string instead of array
    discount: 'invalid-number'
});
const weirdResult = parseAndValidateInvoiceJson(weirdTypesJson);
assert(weirdResult.success === true, 'Weird types do not crash the parser');
assert(weirdResult.extractedInvoice.invoiceNumber === '12345', 'Number invoice number safely cast to string');
assert(weirdResult.hasClient === false, 'Invalid client object ignored gracefully');
assert(weirdResult.warnings.length > 0, 'Generates helpful warnings for invalid types');

// ==========================================
// 2. CLIENT PRECEDENCE & RESOLUTION TESTS
// ==========================================

const dummyJsonClient = {
    name: 'JSON Client Corp',
    mobile: '9999988888',
    email: 'json@client.com',
    address: 'JSON Street, Gujarat',
    gstNumber: '24AAAAA0000A1Z5'
};

const dummyManualClient1 = {
    id: 101,
    name: 'Manual Client Alpha',
    mobile: '1111122222',
    email: 'alpha@manual.com',
    address: 'Manual Avenue 1',
    gstNumber: '24BBBBB1111B1Z2'
};

const dummyManualClient2 = {
    id: 102,
    name: 'Manual Client Beta',
    mobile: '3333344444',
    email: 'beta@manual.com',
    address: 'Manual Avenue 2',
    gstNumber: '24CCCCC2222C1Z3'
};

// Scenario A: JSON has client, no manual client selected -> JSON client used
const resClient1 = resolveInvoiceData({
    extractedData: { client: dummyJsonClient },
    manualClient: null
});
assert(resClient1.clientSource === 'json', 'Client source should be "json"');
assert(resClient1.invoice.recipient.name === 'JSON Client Corp', 'Uses JSON client name');
assert(resClient1.invoice.recipient.mobile === '9999988888', 'Uses JSON client mobile');

// Scenario B: User explicitly selects manual client -> Manual takes precedence
const resClient2 = resolveInvoiceData({
    extractedData: { client: dummyJsonClient },
    manualClient: dummyManualClient1
});
assert(resClient2.clientSource === 'manual', 'Client source should be "manual" when selected');
assert(resClient2.invoice.recipient.name === 'Manual Client Alpha', 'Manual client name overrides JSON client');
assert(resClient2.invoice.recipient.mobile === '1111122222', 'Manual client mobile overrides JSON client');
assert(resClient2.invoice.recipient.email === 'alpha@manual.com', 'Manual client email overrides JSON client');
// Verify information is not merged
assert(resClient2.invoice.recipient.address === 'Manual Avenue 1', 'Does not bleed address from JSON client');

// Scenario C: User switches manual client from Alpha to Beta -> Updates cleanly
const resClient3 = resolveInvoiceData({
    extractedData: { client: dummyJsonClient },
    manualClient: dummyManualClient2
});
assert(resClient3.clientSource === 'manual', 'Client source is still manual');
assert(resClient3.invoice.recipient.name === 'Manual Client Beta', 'Switches to Manual Client Beta');
assert(resClient3.invoice.recipient.mobile === '3333344444', 'Switches to Beta mobile');

// Scenario D: User deselects manual client -> Reverts back to JSON client
const resClient4 = resolveInvoiceData({
    extractedData: { client: dummyJsonClient },
    manualClient: null
});
assert(resClient4.clientSource === 'json', 'Reverts to JSON client after manual deselection');
assert(resClient4.invoice.recipient.name === 'JSON Client Corp', 'Reverts to JSON Client Corp');

// Scenario E: Neither JSON nor manual client -> Defaults to empty walk-in client
const resClient5 = resolveInvoiceData({
    extractedData: { client: null },
    manualClient: null
});
assert(resClient5.clientSource === 'none', 'Client source is "none" when no client info exists');
assert(resClient5.invoice.recipient.name === '', 'Client name is empty');
assert(resClient5.clientName === 'Walk-in Client', 'Client display name is "Walk-in Client"');

// ==========================================
// 3. TEMPLATE PRECEDENCE & RESOLUTION TESTS
// ==========================================

assert(isValidTemplateId('default') === true, '"default" is valid template');
assert(isValidTemplateId('modern_indigo') === true, '"modern_indigo" is valid template');
assert(isValidTemplateId('non_existent_template') === false, 'Non-existent template is invalid');

// Case 1: JSON contains valid template, no manual template -> JSON template used
const resTpl1 = resolveInvoiceData({
    extractedData: { template: 'corporate' },
    manualTemplateId: null
});
assert(resTpl1.templateSource === 'json', 'Template source is "json"');
assert(resTpl1.invoice.template === 'corporate', 'Resolved template is "corporate"');

// Case 2: JSON contains invalid template -> Falls back gracefully to default
const parseInvalidTpl = parseAndValidateInvoiceJson(JSON.stringify({ template: 'fantasy_dragon_layout' }));
assert(parseInvalidTpl.warnings.length > 0, 'Invalid template in JSON triggers warning');
const resTpl2 = resolveInvoiceData({
    extractedData: parseInvalidTpl.extractedInvoice,
    manualTemplateId: null
});
assert(resTpl2.templateSource === 'default', 'Invalid template falls back to "default"');
assert(resTpl2.invoice.template === 'default', 'Resolved template is "default"');

// Case 3: User manually selects template -> Overrides JSON template
const resTpl3 = resolveInvoiceData({
    extractedData: { template: 'corporate' },
    manualTemplateId: 'dark_mode'
});
assert(resTpl3.templateSource === 'manual', 'Manual template selection overrides JSON template');
assert(resTpl3.invoice.template === 'dark_mode', 'Resolved template is "dark_mode"');

// Case 4: No template anywhere -> Defaults to 'default'
const resTpl4 = resolveInvoiceData({
    extractedData: {},
    manualTemplateId: null
});
assert(resTpl4.templateSource === 'default', 'Empty template falls back to default');
assert(resTpl4.invoice.template === 'default', 'Resolved template is "default"');

// ==========================================
// 4. INVOICE EDITOR INTEGRATION & TOTALS TESTS
// ==========================================

const complexJson = {
    invoiceNumber: 'INV-TEST-42',
    issueDate: '2026-11-16',
    IsGST: true,
    IsIGST: false,
    items: [
        { description: 'Widget A', quantity: 2, price: 1000, gstRate: 18 },
        { description: 'Widget B', quantity: 1, price: 2000, gstRate: 18 }
    ],
    discountType: 'fixed',
    discountValue: 500,
    received: 1000
};

const resolvedInvoiceData = resolveInvoiceData({
    extractedData: complexJson,
    nextInvoiceNumberFallback: 'INV-FALLBACK'
});

assert(resolvedInvoiceData.invoice.number === 'INV-TEST-42', 'Invoice number populated');
assert(resolvedInvoiceData.invoice.date === '2026-11-16', 'Invoice date populated');
assert(resolvedInvoiceData.invoice.items.length === 2, 'Items array populated');

// Test calculation consistency with calculateInvoiceTotals
const totals = calculateInvoiceTotals(resolvedInvoiceData.invoice);
assert(totals.subtotal === 4000, `Subtotal expected 4000, got ${totals.subtotal}`);
assert(totals.taxAmount === 720, `Tax amount expected 720, got ${totals.taxAmount}`);
assert(totals.cgstAmount === 360, `CGST expected 360, got ${totals.cgstAmount}`);
assert(totals.sgstAmount === 360, `SGST expected 360, got ${totals.sgstAmount}`);
assert(totals.discountAmount === 500, `Discount expected 500, got ${totals.discountAmount}`);
assert(totals.total === 4220, `Total expected 4220, got ${totals.total}`);
assert(totals.balance === 3220, `Balance expected 3220, got ${totals.balance}`);

// Scenario F: User selects client when JSON does not contain client details
const resClient6 = resolveInvoiceData({
    extractedData: { client: null },
    manualClient: dummyManualClient1
});
assert(resClient6.clientSource === 'manual', 'Manual client selected when JSON has no client');
assert(resClient6.invoice.recipient.name === 'Manual Client Alpha', 'Client name is Manual Client Alpha');

// Scenario G: Template changes multiple times
const resTplMulti1 = resolveInvoiceData({
    extractedData: { template: 'corporate' },
    manualTemplateId: 'modern_indigo'
});
assert(resTplMulti1.templateSource === 'manual', 'First manual override is modern_indigo');
assert(resTplMulti1.invoice.template === 'modern_indigo', 'Resolved template is modern_indigo');

const resTplMulti2 = resolveInvoiceData({
    extractedData: { template: 'corporate' },
    manualTemplateId: 'luxury_gold'
});
assert(resTplMulti2.templateSource === 'manual', 'Second manual override is luxury_gold');
assert(resTplMulti2.invoice.template === 'luxury_gold', 'Resolved template is luxury_gold');

// Scenario H: Partial JSON with only notes and number, items empty
const resPartialEmptyItems = resolveInvoiceData({
    extractedData: { invoiceNumber: 'INV-ONLY-NUM', notes: 'Urgent delivery' }
});
assert(resPartialEmptyItems.invoice.number === 'INV-ONLY-NUM', 'Number preserved');
assert(resPartialEmptyItems.invoice.notes === 'Urgent delivery', 'Notes preserved');
assert(Array.isArray(resPartialEmptyItems.invoice.items) && resPartialEmptyItems.invoice.items.length === 0, 'Items default to empty array');

// ==========================================
// 5. STRICT GST & IGST CONFIGURATION TESTS
// ==========================================

// Test 5.1: Missing IsGST property strictly defaults to false (even if client has GSTIN)
const resGstDefault = resolveInvoiceData({
    extractedData: { client: { name: 'Tax Payer', gstNumber: '24AAAAA0000A1Z5' } }
});
assert(resGstDefault.invoice.IsGST === false, 'IsGST strictly defaults to false when omitted, even if client has GSTIN');

// Test 5.2: Parsing JSON without IsGST defaults extracted IsGST to false
const parseWithoutGst = parseAndValidateInvoiceJson(JSON.stringify({
    invoiceNumber: 'INV-NO-GST',
    items: [{ description: 'Item 1', price: 100, gstRate: 18 }]
}));
assert(parseWithoutGst.extractedInvoice.IsGST === false, 'Extracted IsGST defaults to false when omitted from JSON');
const resWithoutGst = resolveInvoiceData({ extractedData: parseWithoutGst.extractedInvoice });
assert(resWithoutGst.invoice.IsGST === false, 'Resolved invoice IsGST defaults to false when omitted');

// Test 5.3: Explicit "IsGST": true in JSON
const parseWithIsGstTrue = parseAndValidateInvoiceJson(JSON.stringify({
    IsGST: true,
    items: [{ description: 'Item 1', price: 100 }]
}));
assert(parseWithIsGstTrue.extractedInvoice.IsGST === true, 'Extracted IsGST is true when "IsGST": true provided');
const resWithIsGstTrue = resolveInvoiceData({ extractedData: parseWithIsGstTrue.extractedInvoice });
assert(resWithIsGstTrue.invoice.IsGST === true, 'Resolved invoice IsGST is true when "IsGST": true');

// Test 5.4: Explicit "IsGST": false in JSON
const parseWithIsGstFalse = parseAndValidateInvoiceJson(JSON.stringify({
    IsGST: false,
    items: [{ description: 'Item 1', price: 100 }]
}));
assert(parseWithIsGstFalse.extractedInvoice.IsGST === false, 'Extracted IsGST is false when "IsGST": false provided');
const resWithIsGstFalse = resolveInvoiceData({ extractedData: parseWithIsGstFalse.extractedInvoice });
assert(resWithIsGstFalse.invoice.IsGST === false, 'Resolved invoice IsGST is false when "IsGST": false');

// Test 5.5: String boolean representation ("true" / "false")
const parseStringGst = parseAndValidateInvoiceJson(JSON.stringify({ IsGST: "true", IsIGST: "false" }));
assert(parseStringGst.extractedInvoice.IsGST === true, 'String "true" for IsGST parsed as true');
assert(parseStringGst.extractedInvoice.IsIGST === false, 'String "false" for IsIGST parsed as false');

// Test 5.6: manualIsGST override takes precedence over JSON
const resManualGstOverride1 = resolveInvoiceData({
    extractedData: { IsGST: false },
    manualIsGST: true
});
assert(resManualGstOverride1.invoice.IsGST === true, 'manualIsGST: true overrides JSON IsGST: false');

const resManualGstOverride2 = resolveInvoiceData({
    extractedData: { IsGST: true },
    manualIsGST: false
});
assert(resManualGstOverride2.invoice.IsGST === false, 'manualIsGST: false overrides JSON IsGST: true');

// Test 5.7: IsIGST resolution
const resIgstTrue = resolveInvoiceData({
    extractedData: { IsGST: true, IsIGST: true }
});
assert(resIgstTrue.invoice.IsGST === true && resIgstTrue.invoice.IsIGST === true, 'Both IsGST and IsIGST are true');

const resIgstOmitted = resolveInvoiceData({
    extractedData: { IsGST: true }
});
assert(resIgstOmitted.invoice.IsIGST === false, 'IsIGST defaults to false when omitted');

// Test 5.8: Invariant - When IsGST is false, IsIGST MUST resolve to false and tax must be 0
const resNonGstWithIgstTrue = resolveInvoiceData({
    extractedData: {
        IsGST: false,
        IsIGST: true,
        items: [{ description: 'Test Item', quantity: 2, price: 500, gstRate: 18 }]
    }
});
assert(resNonGstWithIgstTrue.invoice.IsGST === false, 'Invoice IsGST is false');
assert(resNonGstWithIgstTrue.invoice.IsIGST === false, 'Invariant enforced: IsIGST is forced to false when IsGST is false');

const nonGstTotals = calculateInvoiceTotals(resNonGstWithIgstTrue.invoice);
assert(nonGstTotals.taxAmount === 0, `Tax amount must be 0 for non-GST invoice, got ${nonGstTotals.taxAmount}`);
assert(nonGstTotals.igstAmount === 0, `IGST amount must be 0 for non-GST invoice, got ${nonGstTotals.igstAmount}`);
assert(nonGstTotals.cgstAmount === 0, 'CGST amount must be 0');
assert(nonGstTotals.sgstAmount === 0, 'SGST amount must be 0');
assert(nonGstTotals.total === 1000, `Total should equal subtotal (1000), got ${nonGstTotals.total}`);

// Test 5.9: Unknown or unagreed property names are ignored
const parseRemovedProperties = parseAndValidateInvoiceJson(JSON.stringify({
    randomTaxFlag: true,
    customField: true
}));
assert(parseRemovedProperties.extractedInvoice.IsGST === false, 'Unknown properties are ignored; IsGST defaults to false');
assert(parseRemovedProperties.extractedInvoice.IsIGST === false, 'IsIGST is false');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
