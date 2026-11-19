import 'fake-indexeddb/auto';
import {
    validateTemplateFile,
    validateTemplateHtml,
    detectTemplateTokens,
    validateTemplateName,
    previewUploadedTemplate,
    SAMPLE_INVOICE_DATA,
    SUPPORTED_TEMPLATE_TOKENS
} from './templateValidator.js';
import { saveTemplateAsync, getAllTemplatesAsync, deleteTemplateAsync } from '../services/templateService.js';
import { db } from '../db/db.js';

console.log('Running Template Validator & Custom Template Upload Tests...');

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

async function runTests() {
    // =========================================================================
    // 1. FILE EXTENSION & OBJECT VALIDATION
    // =========================================================================
    console.log('\n--- 1. Testing File Extension & Object Validation ---');

    assert(!validateTemplateFile(null).valid, 'Rejects null file');
    assert(!validateTemplateFile(undefined).valid, 'Rejects undefined file');
    assert(!validateTemplateFile({}).valid, 'Rejects file object without name');
    assert(!validateTemplateFile({ name: '' }).valid, 'Rejects file with empty name');
    assert(!validateTemplateFile({ name: '   ' }).valid, 'Rejects file with whitespace name');
    assert(!validateTemplateFile({ name: 'invoice.pdf' }).valid, 'Rejects .pdf file');
    assert(!validateTemplateFile({ name: 'template.txt' }).valid, 'Rejects .txt file');
    assert(!validateTemplateFile({ name: 'template.json' }).valid, 'Rejects .json file');
    assert(!validateTemplateFile({ name: 'template.html.zip' }).valid, 'Rejects .zip file ending with .zip');

    assert(validateTemplateFile({ name: 'invoice.html' }).valid, 'Accepts .html file');
    assert(validateTemplateFile({ name: 'custom-template.htm' }).valid, 'Accepts .htm file');
    assert(validateTemplateFile({ name: 'UPPERCASE.HTML' }).valid, 'Accepts case-insensitive .HTML file');
    assert(validateTemplateFile({ name: 'MIXED_CASE.Htm' }).valid, 'Accepts case-insensitive .Htm file');

    // =========================================================================
    // 2. HTML CONTENT & EMPTY FILE VALIDATION
    // =========================================================================
    console.log('\n--- 2. Testing HTML Content & Structure Validation ---');

    assert(!validateTemplateHtml(null).valid, 'Rejects null HTML content');
    assert(!validateTemplateHtml(undefined).valid, 'Rejects undefined HTML content');
    assert(!validateTemplateHtml('').valid, 'Rejects empty string HTML');
    assert(!validateTemplateHtml('   \n\t  ').valid, 'Rejects whitespace-only HTML');
    assert(!validateTemplateHtml('Just some plain text without any HTML tags').valid, 'Rejects plain text without HTML tags');

    assert(validateTemplateHtml('<div>Hello World</div>').valid, 'Accepts basic HTML markup');
    assert(validateTemplateHtml('<!DOCTYPE html><html><body><h1>Invoice</h1></body></html>').valid, 'Accepts complete HTML document');
    assert(validateTemplateHtml('<table class="invoice"><tr><td>{{invoiceNumber}}</td></tr></table>').valid, 'Accepts HTML table fragment');

    // =========================================================================
    // 3. TOKEN DETECTION & WARNING BEHAVIOR
    // =========================================================================
    console.log('\n--- 3. Testing Token Detection & Warnings ---');

    const noTokensHtml = '<div class="static-invoice"><h1>Standard Invoice</h1><p>Static text only</p></div>';
    const noTokenAnalysis = detectTemplateTokens(noTokensHtml);
    assert(!noTokenAnalysis.hasRecognizedTokens, 'Accurately detects 0 recognized tokens in static HTML');
    assert(noTokenAnalysis.warning !== null, 'Generates a warning when no recognized tokens are found');
    assert(noTokenAnalysis.tokensFound.length === 0, 'Reports empty tokensFound list');

    const standardHtml = `
      <div class="invoice">
        <h1>Invoice {{invoiceNumber}}</h1>
        <p>Billed To: {{recipient.name}}</p>
        <p>Total: {{totals.total}}</p>
        {{#items}}
        <div>{{index}}: {{description}} - {{price}}</div>
        {{/items}}
      </div>
    `;
    const standardAnalysis = detectTemplateTokens(standardHtml);
    assert(standardAnalysis.hasRecognizedTokens, 'Detects recognized tokens in template');
    assert(standardAnalysis.warning === null, 'No warning emitted when recognized tokens exist');
    assert(standardAnalysis.recognizedTokens.includes('invoiceNumber'), 'Recognized invoiceNumber');
    assert(standardAnalysis.recognizedTokens.includes('recipient.name'), 'Recognized recipient.name');
    assert(standardAnalysis.recognizedTokens.includes('totals.total'), 'Recognized totals.total');
    assert(standardAnalysis.recognizedTokens.includes('items'), 'Recognized items block');
    assert(standardAnalysis.recognizedTokens.includes('description'), 'Recognized description item token');

    const unrecognizedTokensHtml = '<div>Special: {{unknown_custom_macro}} and {{foo_bar}}</div>';
    const unrecognizedAnalysis = detectTemplateTokens(unrecognizedTokensHtml);
    assert(!unrecognizedAnalysis.hasRecognizedTokens, 'Unrecognized custom macros are not counted as recognized');
    assert(unrecognizedAnalysis.warning !== null, 'Emits warning for unrecognized tokens');
    assert(unrecognizedAnalysis.unrecognizedTokens.includes('unknown_custom_macro'), 'Tracks unrecognized token');

    // =========================================================================
    // 4. TEMPLATE NAME VALIDATION & DUPLICATE CHECKING
    // =========================================================================
    console.log('\n--- 4. Testing Template Name Validation & Duplicates ---');

    assert(!validateTemplateName(null).valid, 'Rejects null template name');
    assert(!validateTemplateName('').valid, 'Rejects empty template name');
    assert(!validateTemplateName('   ').valid, 'Rejects whitespace-only template name');

    const existingTemplates = [
        { id: 1, name: 'Classic' },
        { id: 2, name: 'Modern Indigo' },
        { id: 3, name: 'Minimalist' }
    ];

    assert(validateTemplateName('Bespoke Layout', existingTemplates).valid, 'Accepts unique template name');
    assert(validateTemplateName('  Bespoke Layout  ', existingTemplates).trimmedName === 'Bespoke Layout', 'Trims whitespace in valid name');

    const dup1 = validateTemplateName('Classic', existingTemplates);
    assert(!dup1.valid && dup1.error.includes('already exists'), 'Rejects exact duplicate template name');

    const dup2 = validateTemplateName('  classic  ', existingTemplates);
    assert(!dup2.valid && dup2.error.includes('already exists'), 'Rejects case-insensitive and whitespace duplicate name');

    const dup3 = validateTemplateName('MODERN INDIGO', existingTemplates);
    assert(!dup3.valid && dup3.error.includes('already exists'), 'Rejects uppercase duplicate name');

    // Updating existing template with same name should be permitted when currentTemplateId matches
    const selfUpdate = validateTemplateName('Classic', existingTemplates, 1);
    assert(selfUpdate.valid, 'Permits retaining same name when editing existing template (id matches)');

    // =========================================================================
    // 5. LIVE PREVIEW WITH SAMPLE DATA & SANITIZATION
    // =========================================================================
    console.log('\n--- 5. Testing Preview Rendering with Sample Data & Security ---');

    const previewTemplate = `
      <div class="custom-card">
        <h2>{{sender.name}}</h2>
        <p>Invoice #{{invoiceNumber}}</p>
        <p>Customer: {{recipient.name}}</p>
        <p>Total: {{currency}}{{totals.total}}</p>
        <script>window.pwned = true;</script>
        <a href="javascript:alert(1)" onclick="evil()">Click Me</a>
        <style>
          .custom-card { color: #1e3a8a; }
          body { background: url('javascript:void(0)'); }
        </style>
      </div>
    `;

    const renderedPreview = previewUploadedTemplate(previewTemplate);
    assert(typeof renderedPreview === 'string' && renderedPreview.length > 0, 'Generates rendered preview HTML');
    assert(renderedPreview.includes('Apex Solutions Pvt Ltd'), 'Renders sender.name from sample invoice data');
    assert(renderedPreview.includes('INV-2026-001'), 'Renders invoiceNumber from sample invoice data');
    assert(renderedPreview.includes('Global Enterprises Ltd'), 'Renders recipient.name from sample invoice data');
    assert(renderedPreview.includes('68,800.00'), 'Renders formatted total from sample invoice data');

    // Security checks during preview
    assert(!renderedPreview.includes('<script>'), 'Preview sanitization strips <script> tags');
    assert(!renderedPreview.includes('window.pwned'), 'Preview sanitization removes script execution bodies');
    assert(!renderedPreview.includes('onclick'), 'Preview sanitization strips onclick event handlers');
    assert(!renderedPreview.includes('javascript:alert'), 'Preview sanitization removes javascript: hrefs');
    assert(!renderedPreview.includes('javascript:void'), 'Preview sanitization removes javascript: in CSS url');
    assert(renderedPreview.includes('color:#1e3a8a') || renderedPreview.includes('color: #1e3a8a'), 'Preview preserves legitimate CSS styling');

    // Handling missing sample data gracefully
    const sparseHtml = '<div>{{nonExistentProperty}} - {{sender.missingSubProperty}}</div>';
    const sparseRender = previewUploadedTemplate(sparseHtml);
    assert(sparseRender === '<div> - </div>', 'Handles missing tokens gracefully without throws or undefined leaks');

    // =========================================================================
    // 6. PERSISTENCE IN DEXIE (saveTemplateAsync & isBuiltIn flag)
    // =========================================================================
    console.log('\n--- 6. Testing Custom Template Persistence in Dexie ---');

    await db.open();

    const customUploadedHtml = '<div class="user-custom-tpl"><h1>{{sender.name}}</h1><p>{{invoiceNumber}}</p></div>';
    const customTemplateRecord = {
        name: 'My Custom Corporate Theme',
        html: customUploadedHtml,
        css: '',
        isBuiltIn: false,
        isDefault: false
    };

    const savedId = await saveTemplateAsync(customTemplateRecord, db);
    assert(typeof savedId === 'number', 'saveTemplateAsync returns generated numeric template ID');

    const fetched = await db.templates.get(savedId);
    assert(fetched !== undefined, 'Custom template found in Dexie templates table');
    assert(fetched.name === 'My Custom Corporate Theme', 'Persisted template name matches');
    assert(fetched.isBuiltIn === false, 'isBuiltIn is strictly false for uploaded templates');
    assert(fetched.html === customUploadedHtml, 'Original uploaded raw HTML is preserved unchanged');
    assert(fetched.updatedAt instanceof Date, 'updatedAt timestamp populated');

    // Verify it appears in getAllTemplatesAsync
    const allTemplates = await getAllTemplatesAsync(db);
    const customInList = allTemplates.find(t => t.id === savedId);
    assert(customInList !== undefined, 'Custom template appears in getAllTemplatesAsync list');

    // Clean up
    await deleteTemplateAsync(savedId, db);
    const afterDelete = await db.templates.get(savedId);
    assert(afterDelete === undefined, 'Custom template successfully deleted after test');

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Unhandled error in templateValidator.test.js:', err);
    process.exit(1);
});
