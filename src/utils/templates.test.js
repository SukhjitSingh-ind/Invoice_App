import { TEMPLATES, getTemplateById } from './templates.js';

console.log('Running Template Tests...');

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

// 1. Templates collection integrity
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

// 2. getTemplateById resolution
const defaultTmpl = getTemplateById('default');
assert(defaultTmpl && defaultTmpl.id === 'default', 'Should resolve default template');

const modernTmpl = getTemplateById('modern_indigo');
assert(modernTmpl && modernTmpl.layout === 'modern', 'Should resolve modern template layout');

// 3. Fallback behavior for invalid or missing template ID
const fallbackTmpl = getTemplateById('non_existent_template_id');
assert(fallbackTmpl && fallbackTmpl.id === 'default', 'Invalid template ID should safely fallback to default');

const nullFallback = getTemplateById(null);
assert(nullFallback && nullFallback.id === 'default', 'Null template ID should safely fallback to default');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);

