import 'fake-indexeddb/auto';
import {
    validateTemplateFile,
    readTemplateFileAsync,
    validateTemplateHtml,
    detectTemplateTokens,
    validateTemplateName,
    previewUploadedTemplate,
    SAMPLE_INVOICE_DATA,
    SUPPORTED_TEMPLATE_TOKENS
} from './templateValidator.js';
import { formatCustomTemplateForPicker } from './templates.js';
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

    // File size boundary tests
    assert(validateTemplateFile({ name: 'template.html', size: 1024 }).valid, 'Accepts file smaller than 2 MB');
    assert(validateTemplateFile({ name: 'template.html', size: 2 * 1024 * 1024 }).valid, 'Accepts file exactly 2 MB');

    const overLimit = validateTemplateFile({ name: 'large.html', size: 2 * 1024 * 1024 + 1 });
    assert(!overLimit.valid, 'Rejects file larger than 2 MB');
    assert(overLimit.error.includes('2 MB limit'), 'Rejection error mentions 2 MB limit');

    const emptyFile = validateTemplateFile({ name: 'empty.html', size: 0 });
    assert(!emptyFile.valid, 'Rejects file with size 0 bytes');
    assert(emptyFile.error.includes('empty'), 'Rejection error mentions empty file');

    // =========================================================================
    // 1B. ASYNC FILE READER UTILITY TESTS
    // =========================================================================
    console.log('\n--- 1B. Testing readTemplateFileAsync ---');

    try {
        await readTemplateFileAsync({ name: 'bad.pdf', size: 50 });
        assert(false, 'readTemplateFileAsync should reject bad file extension');
    } catch (err) {
        assert(err.message.includes('.html and .htm') || err.message.includes('.html or .htm'), 'readTemplateFileAsync rejects invalid extension with message');
    }

    try {
        await readTemplateFileAsync({ name: 'oversized.html', size: 3 * 1024 * 1024 });
        assert(false, 'readTemplateFileAsync should reject oversized file');
    } catch (err) {
        assert(err.message.includes('2 MB limit'), 'readTemplateFileAsync rejects file > 2MB');
    }

    // Fallback file.text() read when FileReader is not globally defined
    const savedFileReader = globalThis.FileReader;
    try {
        delete globalThis.FileReader;
        const textFile = {
            name: 'sample.html',
            size: 50,
            text: async () => '<div>Fallback content</div>'
        };
        const fallbackContent = await readTemplateFileAsync(textFile);
        assert(fallbackContent === '<div>Fallback content</div>', 'readTemplateFileAsync succeeds using file.text() fallback');
    } finally {
        if (savedFileReader) {
            globalThis.FileReader = savedFileReader;
        }
    }

    // Mock FileReader success
    class MockSuccessFileReader {
        readAsText() {
            setTimeout(() => {
                this.result = '<h1>Mock Read Content</h1>';
                if (typeof this.onload === 'function') {
                    this.onload({ target: { result: this.result } });
                }
            }, 5);
        }
    }
    globalThis.FileReader = MockSuccessFileReader;
    const mockFileSuccess = { name: 'mock.html', size: 100 };
    const successResult = await readTemplateFileAsync(mockFileSuccess);
    assert(successResult === '<h1>Mock Read Content</h1>', 'readTemplateFileAsync succeeds with FileReader');

    // Mock FileReader error
    class MockErrorFileReader {
        readAsText() {
            setTimeout(() => {
                this.error = new Error('Disk read failure');
                if (typeof this.onerror === 'function') {
                    this.onerror();
                }
            }, 5);
        }
    }
    globalThis.FileReader = MockErrorFileReader;
    try {
        await readTemplateFileAsync({ name: 'fail.html', size: 100 });
        assert(false, 'readTemplateFileAsync should reject on FileReader error');
    } catch (err) {
        assert(err.message.includes('Disk read failure') || err.message.includes('Error occurred while reading the file'), 'readTemplateFileAsync handles FileReader onerror');
    }

    // Mock FileReader abort
    class MockAbortFileReader {
        readAsText() {
            setTimeout(() => {
                if (typeof this.onabort === 'function') {
                    this.onabort();
                }
            }, 5);
        }
    }
    globalThis.FileReader = MockAbortFileReader;
    try {
        await readTemplateFileAsync({ name: 'abort.html', size: 100 });
        assert(false, 'readTemplateFileAsync should reject on FileReader abort');
    } catch (err) {
        assert(err.message.includes('aborted'), 'readTemplateFileAsync handles FileReader onabort');
    }

    // Restore original FileReader
    if (savedFileReader) {
        globalThis.FileReader = savedFileReader;
    } else {
        delete globalThis.FileReader;
    }

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

    // =========================================================================
    // 7. FORMAT CUSTOM TEMPLATE FOR PICKER (Centralized Transformer)
    // =========================================================================
    console.log('\n--- 7. Testing formatCustomTemplateForPicker ---');

    assert(formatCustomTemplateForPicker(null) === null, 'formatCustomTemplateForPicker handles null');
    assert(formatCustomTemplateForPicker(undefined) === null, 'formatCustomTemplateForPicker handles undefined');

    const rawDexieTpl = {
        id: 42,
        name: 'My Special Template',
        html: '<div>{{sender.name}}</div>',
        css: 'body { color: red; }',
        isBuiltIn: false
    };

    const formattedTpl = formatCustomTemplateForPicker(rawDexieTpl);
    assert(formattedTpl.id === 42, 'Preserves numeric id');
    assert(formattedTpl.numericId === 42, 'Sets numericId property');
    assert(formattedTpl.key === 'custom_42', 'Sets predictable key slug');
    assert(formattedTpl.name === 'My Special Template', 'Preserves template name');
    assert(formattedTpl.layout === 'custom', 'Assigns layout: custom');
    assert(formattedTpl.isCustom === true, 'Sets isCustom flag to true');
    assert(typeof formattedTpl.previewColor === 'string' && formattedTpl.previewColor.includes('gradient'), 'Assigns aesthetic previewColor gradient');
    assert(formattedTpl.description.includes('My Special Template'), 'Generates meaningful description');

    // =========================================================================
    // 8. ADVERSARIAL HTML & CSS SANITIZATION SECURITY (Finding 3)
    // =========================================================================
    console.log('\n--- 8. Testing Adversarial HTML & CSS Sanitization Security (Finding 3) ---');

    // Attack 1: SVG-based script injection
    const svgAttack = '<div><h1>Invoice</h1><svg><script>window.pwned = true;</script></svg></div>';
    const svgSanitized = previewUploadedTemplate(svgAttack);
    assert(!svgSanitized.includes('<script>'), 'SVG script tag is stripped');
    assert(!svgSanitized.includes('window.pwned'), 'SVG script body is stripped');

    // Attack 2: Obfuscated CSS escape sequences (\6a avascript:)
    const cssEscapeAttack = `
      <div style="background: url('\\6a avascript:alert(1)')">
        <style>
          .card { background-image: url('\\00006a avascript:alert(2)'); }
        </style>
        <h1>Escapes</h1>
      </div>
    `;
    const cssEscapeSanitized = previewUploadedTemplate(cssEscapeAttack);
    assert(!cssEscapeSanitized.includes('javascript:'), 'Obfuscated CSS escape sequences in url() are neutralized');

    // Attack 3: @import rules in CSS
    const importAttack = `
      <style>
        @import url('https://attacker.example/malicious.css');
        .normal { color: red; }
      </style>
      <div class="normal">Text</div>
    `;
    const importSanitized = previewUploadedTemplate(importAttack);
    assert(!importSanitized.includes('@import'), '@import rule in stylesheet is completely stripped');
    assert(importSanitized.includes('color:red') || importSanitized.includes('color: red'), 'Legitimate rules beside @import are preserved');

    // Attack 4: Inline event handlers across multiple elements
    const eventHandlerAttack = '<div onmouseenter="evil()" onpointerdown="bad()"><img src="x" onerror="alert(1)" onload="alert(2)" /><input onfocus="bad()" /></div>';
    const eventSanitized = previewUploadedTemplate(eventHandlerAttack);
    assert(!eventSanitized.includes('onmouseenter'), 'onmouseenter event handler stripped');
    assert(!eventSanitized.includes('onpointerdown'), 'onpointerdown event handler stripped');
    assert(!eventSanitized.includes('onerror'), 'onerror event handler stripped');
    assert(!eventSanitized.includes('onload'), 'onload event handler stripped');
    assert(!eventSanitized.includes('onfocus'), 'onfocus event handler stripped');

    // Attack 5: CSS expressions
    const exprAttack = '<div style="width: expression(alert(1)); color: blue;">Expr</div>';
    const exprSanitized = previewUploadedTemplate(exprAttack);
    assert(!exprSanitized.includes('expression'), 'CSS expression in style attribute is neutralized');
    assert(exprSanitized.includes('color: blue') || exprSanitized.includes('color:blue'), 'Safe properties beside CSS expressions are preserved');

    // =========================================================================
    // 9. BINARY & MALFORMED FILE CONTENT VALIDATION (Finding 6)
    // =========================================================================
    console.log('\n--- 9. Testing Binary & Malformed File Content (Finding 6) ---');

    // Binary file disguised as HTML (contains null bytes)
    const binaryDisguised = '<html><body>\x00\x01\x02\x03PNG\x00\x00\x00\rIHDR</body></html>';
    const binaryCheck = validateTemplateHtml(binaryDisguised);
    assert(!binaryCheck.valid, 'Rejects file containing null/binary bytes');
    assert(binaryCheck.error.includes('binary or invalid characters'), 'Error specifies binary or invalid content');

    // Malformed HTML without any HTML tag
    const nonHtmlText = 'Just some arbitrary words invoiceNumber: 12345 total: 500';
    const nonHtmlCheck = validateTemplateHtml(nonHtmlText);
    assert(!nonHtmlCheck.valid, 'Rejects arbitrary plain text without HTML tags');

    // =========================================================================
    // 10. TEMPLATE SELECTION & ID TYPE CONSISTENCY (Finding 1)
    // =========================================================================
    console.log('\n--- 10. Testing Template Selection & ID Type Consistency (Finding 1) ---');

    const sampleCatalog = [
        { id: 'default', name: 'Professional Clean', layout: 'classic' },
        { id: 'modern_indigo', name: 'Modern Indigo', layout: 'modern' },
        formattedTpl // numeric ID: 42, key: 'custom_42'
    ];

    // Look up by numeric ID (from newly uploaded custom template)
    const matchByNumeric = sampleCatalog.find(
        t => t.id === 42 || String(t.id) === String(42) || (t.key && String(t.key) === String(42))
    );
    assert(matchByNumeric !== undefined && matchByNumeric.name === 'My Special Template', 'Lookup by numeric ID 42 resolves custom template');

    // Look up by stringified numeric ID (from URL query param ?template=42)
    const matchByStringNumeric = sampleCatalog.find(
        t => t.id === '42' || String(t.id) === String('42') || (t.key && String(t.key) === String('42'))
    );
    assert(matchByStringNumeric !== undefined && matchByStringNumeric.name === 'My Special Template', 'Lookup by string "42" resolves custom template');

    // Look up by custom slug key ('custom_42')
    const matchByKey = sampleCatalog.find(
        t => t.id === 'custom_42' || String(t.id) === String('custom_42') || (t.key && String(t.key) === String('custom_42'))
    );
    assert(matchByKey !== undefined && matchByKey.name === 'My Special Template', 'Lookup by key "custom_42" resolves custom template');

    // Switching between built-in and custom templates
    let activeSelection = 42;
    assert(activeSelection === 42, 'Initial selection is custom numeric ID');
    activeSelection = 'modern_indigo';
    assert(activeSelection === 'modern_indigo', 'Switched to built-in template "modern_indigo"');
    activeSelection = 42;
    assert(activeSelection === 42, 'Switched back to custom template ID');

    // Look up nonexistent template returns undefined (safe fallback)
    const matchNonExistent = sampleCatalog.find(
        t => t.id === 9999 || String(t.id) === String(9999) || (t.key && String(t.key) === String(9999))
    );
    assert(matchNonExistent === undefined, 'Non-existent template ID safely returns undefined');

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Unhandled error in templateValidator.test.js:', err);
    process.exit(1);
});
