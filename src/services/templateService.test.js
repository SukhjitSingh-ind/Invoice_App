import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {
    TABLE_NAMES,
    STORAGE_KEYS,
    BUILT_IN_TEMPLATE_NAMES,
    BUILT_IN_TEMPLATE_KEYS,
    DEFAULT_BUILT_IN_TEMPLATE_NAME,
    TEMPLATE_SCHEMA,
    CURRENT_BACKUP_VERSION
} from '../constants/index.js';
import {
    seedBuiltInTemplates,
    getAllTemplatesAsync,
    getTemplateByIdAsync,
    getDefaultTemplate,
    saveTemplateAsync,
    deleteTemplateAsync,
    resolveValidTemplateId,
    validateTemplate,
    setDefaultTemplateAsync
} from './templateService.js';
import {
    loadSettingsFromDb,
    getSettings,
    updateSettings,
    resetSettings,
    getSelectedTemplateId,
    setSelectedTemplateId,
    getSelectedTemplateAsync
} from './settingsService.js';
import { exportFullBackup, importFullBackup, createFullBackupData } from './backupService.js';
import { db, InvoiceAppDatabase } from '../db/db.js';

console.log('Running Dexie v2 Template Migration, Seeding, Backup & Settings Regression Tests...');

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
    // 1. DEXIE V1 -> V2 MIGRATION & SCHEMA INTEGRITY TESTS
    // =========================================================================
    console.log('\n--- 1. Testing Dexie v1 -> v2 Migration & Schema ---');

    const testDbName = 'TestMigrationDB_' + Date.now();

    const v1Db = new Dexie(testDbName);
    v1Db.version(1).stores({
        [TABLE_NAMES.INVOICES]: 'id, number, date, IsGST, IsIGST, template, recipient.name, recipient.gstNumber',
        [TABLE_NAMES.CLIENTS]: 'id, name, mobile, email, gstNumber, createdAt',
        [TABLE_NAMES.ITEMS]: 'id, name, hsnSac, defaultPrice, createdAt',
        [TABLE_NAMES.COMPANIES]: 'id, name, gstNumber, isDefault',
        [TABLE_NAMES.SETTINGS]: 'key'
    });

    await v1Db.open();
    assert(v1Db.verno === 1, 'v1 database initialized at version 1');

    await v1Db.table(TABLE_NAMES.INVOICES).add({
        id: 'inv-v1-01',
        number: 'INV-100',
        date: '2026-01-01',
        IsGST: true,
        IsIGST: false,
        template: 'classic',
        recipient: { name: 'Alpha Client', gstNumber: '24AAAAA0000A1Z5' }
    });

    await v1Db.table(TABLE_NAMES.CLIENTS).add({
        id: 'client-v1-01',
        name: 'Alpha Client',
        mobile: '9876543210',
        email: 'alpha@example.com',
        gstNumber: '24AAAAA0000A1Z5',
        createdAt: new Date().toISOString()
    });

    await v1Db.table(TABLE_NAMES.SETTINGS).put({
        key: STORAGE_KEYS.APP_CONFIG,
        value: {
            validation: { requireInvoiceNumber: true },
            display: { showLogo: true },
            payment: { upiId: 'test@upi' },
            activeProfileId: 'default'
        }
    });

    v1Db.close();

    const v2Db = new Dexie(testDbName);
    v2Db.version(1).stores({
        [TABLE_NAMES.INVOICES]: 'id, number, date, IsGST, IsIGST, template, recipient.name, recipient.gstNumber',
        [TABLE_NAMES.CLIENTS]: 'id, name, mobile, email, gstNumber, createdAt',
        [TABLE_NAMES.ITEMS]: 'id, name, hsnSac, defaultPrice, createdAt',
        [TABLE_NAMES.COMPANIES]: 'id, name, gstNumber, isDefault',
        [TABLE_NAMES.SETTINGS]: 'key'
    });
    v2Db.version(2).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA
    });

    await v2Db.open();
    assert(v2Db.verno === 2, 'Database successfully upgraded from version 1 to version 2');

    const preservedInvoices = await v2Db.table(TABLE_NAMES.INVOICES).toArray();
    assert(preservedInvoices.length === 1, 'Existing invoices store preserved (count = 1)');
    assert(preservedInvoices[0].number === 'INV-100', 'Existing invoice data intact');

    const preservedClients = await v2Db.table(TABLE_NAMES.CLIENTS).toArray();
    assert(preservedClients.length === 1, 'Existing clients store preserved (count = 1)');
    assert(preservedClients[0].name === 'Alpha Client', 'Existing client data intact');

    const preservedConfig = await v2Db.table(TABLE_NAMES.SETTINGS).get(STORAGE_KEYS.APP_CONFIG);
    assert(preservedConfig !== undefined && preservedConfig.value.payment.upiId === 'test@upi', 'Existing settings preserved intact');

    const tables = v2Db.tables.map(t => t.name);
    assert(tables.includes(TABLE_NAMES.TEMPLATES), 'New "templates" store exists in Dexie');

    const templatesTable = v2Db.table(TABLE_NAMES.TEMPLATES);
    assert(templatesTable.schema.primKey.name === 'id', 'Templates primary key is "id"');
    assert(templatesTable.schema.primKey.auto === true, 'Templates primary key is auto-increment (++id)');

    const indexNames = templatesTable.schema.indexes.map(idx => idx.name);
    assert(indexNames.includes('name'), 'Templates has index on "name"');
    assert(indexNames.includes('isDefault'), 'Templates has index on "isDefault"');
    assert(indexNames.includes('isBuiltIn'), 'Templates has index on "isBuiltIn"');
    assert(indexNames.includes('updatedAt'), 'Templates has index on "updatedAt"');

    // =========================================================================
    // 2. TEMPLATE SEEDING & CONTENT TESTS
    // =========================================================================
    console.log('\n--- 2. Testing Template Seeding & Record Content ---');

    const seedResult = await seedBuiltInTemplates(v2Db);
    assert(seedResult.seededCount === 3, 'Initial seeding inserted exactly 3 templates');
    assert(seedResult.existingCount === 0, 'Existing templates count was 0 before seed');

    const allTemplates = await getAllTemplatesAsync(v2Db);
    assert(allTemplates.length === 3, 'Templates table contains exactly 3 records');

    const classic = allTemplates.find(t => t.name === BUILT_IN_TEMPLATE_NAMES.CLASSIC);
    assert(classic !== undefined, 'Classic template is seeded');
    assert(classic.isBuiltIn === true, 'Classic is marked as built-in');
    assert(classic.isDefault === true, 'Classic is marked as default (isDefault = true)');
    assert(typeof classic.html === 'string' && classic.html.length > 200, 'Classic contains complete HTML');
    assert(typeof classic.css === 'string' && classic.css.length > 200, 'Classic contains complete CSS');
    assert(classic.html.includes('classic-layout'), 'Classic HTML uses classic-layout container');
    assert(classic.html.includes('{{sender.name}}'), 'Classic HTML contains {{sender.name}} token');
    assert(classic.html.includes('{{recipient.name}}'), 'Classic HTML contains {{recipient.name}} token');
    assert(classic.html.includes('{{invoice.number}}'), 'Classic HTML contains {{invoice.number}} token');
    assert(classic.html.includes('{{#items}}'), 'Classic HTML contains {{#items}} token');
    assert(classic.html.includes('{{totals.total}}'), 'Classic HTML contains {{totals.total}} token');
    assert(classic.html.includes('{{bankDetails.bankName}}'), 'Classic HTML contains {{bankDetails.bankName}} token');
    assert(classic.updatedAt instanceof Date, 'Classic updatedAt is a valid Date object');

    const modern = allTemplates.find(t => t.name === BUILT_IN_TEMPLATE_NAMES.MODERN);
    assert(modern !== undefined, 'Modern template is seeded');
    assert(modern.isBuiltIn === true, 'Modern is marked as built-in');
    assert(modern.isDefault === false, 'Modern is not default (isDefault = false)');
    assert(typeof modern.html === 'string' && modern.html.length > 200, 'Modern contains complete HTML');
    assert(typeof modern.css === 'string' && modern.css.length > 200, 'Modern contains complete CSS');
    assert(modern.html.includes('modern-layout'), 'Modern HTML uses modern-layout container');
    assert(modern.html.includes('{{sender.name}}'), 'Modern HTML contains {{sender.name}} token');
    assert(modern.html.includes('{{#items}}'), 'Modern HTML contains {{#items}} token');
    assert(modern.html.includes('{{totals.total}}'), 'Modern HTML contains {{totals.total}} token');

    const minimal = allTemplates.find(t => t.name === BUILT_IN_TEMPLATE_NAMES.MINIMAL);
    assert(minimal !== undefined, 'Minimal template is seeded');
    assert(minimal.isBuiltIn === true, 'Minimal is marked as built-in');
    assert(minimal.isDefault === false, 'Minimal is not default (isDefault = false)');
    assert(typeof minimal.html === 'string' && minimal.html.length > 200, 'Minimal contains complete HTML');
    assert(typeof minimal.css === 'string' && minimal.css.length > 200, 'Minimal contains complete CSS');
    assert(minimal.html.includes('minimal-layout'), 'Minimal HTML uses minimal-layout container');
    assert(minimal.html.includes('{{sender.name}}'), 'Minimal HTML contains {{sender.name}} token');
    assert(minimal.html.includes('{{#items}}'), 'Minimal HTML contains {{#items}} token');
    assert(minimal.html.includes('{{totals.total}}'), 'Minimal HTML contains {{totals.total}} token');

    // =========================================================================
    // 3. IDEMPOTENCE, CONCURRENCY & PROTECTION OF CUSTOMIZATIONS
    // =========================================================================
    console.log('\n--- 3. Testing Idempotence, Concurrency & Customization Protection ---');

    // Repeated sequential initialization
    const repeatResult = await seedBuiltInTemplates(v2Db);
    assert(repeatResult.seededCount === 0, 'Repeated seeding inserted 0 new templates');
    assert(repeatResult.existingCount === 3, 'Repeated seeding detected 3 existing templates');

    const templatesAfterRepeat = await getAllTemplatesAsync(v2Db);
    assert(templatesAfterRepeat.length === 3, 'Templates count remains strictly 3 after second seed');

    // Concurrent initialization calls
    const [c1, c2, c3] = await Promise.all([
        seedBuiltInTemplates(v2Db),
        seedBuiltInTemplates(v2Db),
        seedBuiltInTemplates(v2Db)
    ]);
    const templatesAfterConcurrent = await getAllTemplatesAsync(v2Db);
    assert(templatesAfterConcurrent.length === 3, 'Concurrent seeding calls produced 0 duplicate templates');
    assert(c1.existingCount === 3 && c2.existingCount === 3 && c3.existingCount === 3, 'Concurrent calls safely detected existing templates');

    // Customized built-in templates must not be overwritten
    const classicRecord = await v2Db.table(TABLE_NAMES.TEMPLATES).where('name').equals(BUILT_IN_TEMPLATE_NAMES.CLASSIC).first();
    const customizedHtml = '<div class="custom-classic-header">My Custom Header</div>';
    await v2Db.table(TABLE_NAMES.TEMPLATES).update(classicRecord.id, { html: customizedHtml });

    await seedBuiltInTemplates(v2Db);
    const reloadedClassic = await v2Db.table(TABLE_NAMES.TEMPLATES).get(classicRecord.id);
    assert(reloadedClassic.html === customizedHtml, 'Customized built-in template HTML was preserved (not overwritten)');

    // Partial template recovery: delete Modern, re-seed inserts only Modern
    const modernRecord = await v2Db.table(TABLE_NAMES.TEMPLATES).where('name').equals(BUILT_IN_TEMPLATE_NAMES.MODERN).first();
    await v2Db.table(TABLE_NAMES.TEMPLATES).delete(modernRecord.id);
    const countBeforePartialSeed = await v2Db.table(TABLE_NAMES.TEMPLATES).count();
    assert(countBeforePartialSeed === 2, 'Template count is 2 after deleting Modern');

    const partialSeedResult = await seedBuiltInTemplates(v2Db);
    assert(partialSeedResult.seededCount === 1, 'Partial re-seed inserted only the 1 missing template');
    assert(partialSeedResult.existingCount === 2, 'Partial re-seed preserved the 2 existing templates');

    const recoveredModern = await v2Db.table(TABLE_NAMES.TEMPLATES).where('name').equals(BUILT_IN_TEMPLATE_NAMES.MODERN).first();
    assert(recoveredModern !== undefined, 'Missing Modern template was successfully recovered');

    // User-created templates must remain untouched
    const customUserTemplateId = await saveTemplateAsync({
        name: 'Bespoke Vintage Layout',
        key: 'bespoke_vintage',
        isDefault: false,
        isBuiltIn: false,
        html: '<div class="vintage">Custom Vintage Layout</div>',
        css: '.vintage { color: brown; }'
    }, v2Db);

    assert(typeof customUserTemplateId === 'number', 'User template created successfully with auto-increment ID');

    await seedBuiltInTemplates(v2Db);
    const userTemplateAfterSeed = await getTemplateByIdAsync(customUserTemplateId, v2Db);
    assert(userTemplateAfterSeed !== null, 'User-created template exists after re-seeding');
    assert(userTemplateAfterSeed.name === 'Bespoke Vintage Layout', 'User-created template properties preserved');
    assert(userTemplateAfterSeed.isBuiltIn === false, 'User-created template isBuiltIn is false');

    const totalWithUserTemplate = await getAllTemplatesAsync(v2Db);
    assert(totalWithUserTemplate.length === 4, 'Total templates is 4 (3 built-in + 1 user template)');

    await deleteTemplateAsync(customUserTemplateId, v2Db);
    const afterDelete = await getTemplateByIdAsync(customUserTemplateId, v2Db);
    assert(afterDelete === null, 'deleteTemplateAsync successfully deletes template');

    // =========================================================================
    // 4. APP SETTINGS & REPAIRED SETTINGS PERSISTENCE
    // =========================================================================
    console.log('\n--- 4. Testing Settings Integration & Repaired Persistence ---');

    const updatedSettingsRecord = await v2Db.table(TABLE_NAMES.SETTINGS).get(STORAGE_KEYS.APP_CONFIG);
    assert(updatedSettingsRecord.value.selectedTemplateId !== undefined, 'selectedTemplateId is defined in settings');
    assert(updatedSettingsRecord.value.selectedTemplateId === classicRecord.id, 'Initial selectedTemplateId references Classic ID');
    assert(updatedSettingsRecord.value.payment.upiId === 'test@upi', 'Settings payment.upiId preserved');
    assert(updatedSettingsRecord.value.validation.requireInvoiceNumber === true, 'Settings validation preserved');

    // Valid user selection is preserved across re-seed
    const modernInV2 = await v2Db.table(TABLE_NAMES.TEMPLATES).where('name').equals(BUILT_IN_TEMPLATE_NAMES.MODERN).first();
    updatedSettingsRecord.value.selectedTemplateId = modernInV2.id;
    await v2Db.table(TABLE_NAMES.SETTINGS).put(updatedSettingsRecord);

    await seedBuiltInTemplates(v2Db);
    const settingsAfterModernSelect = await v2Db.table(TABLE_NAMES.SETTINGS).get(STORAGE_KEYS.APP_CONFIG);
    assert(settingsAfterModernSelect.value.selectedTemplateId === modernInV2.id, 'User selected modern template ID preserved across re-seed');

    // Invalid template reference gracefully falls back and repairs
    settingsAfterModernSelect.value.selectedTemplateId = 99999;
    await v2Db.table(TABLE_NAMES.SETTINGS).put(settingsAfterModernSelect);

    await seedBuiltInTemplates(v2Db);
    const settingsAfterInvalidReference = await v2Db.table(TABLE_NAMES.SETTINGS).get(STORAGE_KEYS.APP_CONFIG);
    assert(settingsAfterInvalidReference.value.selectedTemplateId === classicRecord.id, 'Invalid template ID gracefully repaired to default template ID');

    // Test resolveValidTemplateId directly
    const validClassicId = await resolveValidTemplateId(classicRecord.id, v2Db);
    assert(validClassicId === classicRecord.id, 'resolveValidTemplateId confirms existing template ID');

    const fallbackForInvalid = await resolveValidTemplateId(99999, v2Db);
    assert(fallbackForInvalid === classicRecord.id, 'resolveValidTemplateId falls back for missing template ID');

    const fallbackForNull = await resolveValidTemplateId(null, v2Db);
    assert(fallbackForNull === classicRecord.id, 'resolveValidTemplateId falls back for null template ID');

    v2Db.close();
    await Dexie.delete(testDbName);

    // =========================================================================
    // 5. APPLICATION SINGLETON DB & REPAIRED SETTINGS PERSISTENCE
    // =========================================================================
    console.log('\n--- 5. Testing Application DB Singleton & Settings Persistence ---');

    await seedBuiltInTemplates(db);
    const loadedSettings = await loadSettingsFromDb();
    assert(loadedSettings.selectedTemplateId !== undefined && loadedSettings.selectedTemplateId !== null, 'loadSettingsFromDb loads valid selectedTemplateId');

    const activeTpl = await getSelectedTemplateAsync();
    assert(activeTpl !== null && typeof activeTpl.name === 'string', 'getSelectedTemplateAsync resolves active template object');

    // Update selected template
    const modernInAppDb = await db.templates.where('name').equals(BUILT_IN_TEMPLATE_NAMES.MODERN).first();
    if (modernInAppDb) {
        await setSelectedTemplateId(modernInAppDb.id);
        assert(getSelectedTemplateId() === modernInAppDb.id, 'setSelectedTemplateId updates cached settings');
        const updatedTpl = await getSelectedTemplateAsync();
        assert(updatedTpl.name === BUILT_IN_TEMPLATE_NAMES.MODERN, 'getSelectedTemplateAsync resolves updated Modern template');

        await updateSettings({ selectedTemplateId: modernInAppDb.id });
        const syncSettings = getSettings();
        assert(syncSettings.selectedTemplateId === modernInAppDb.id, 'getSettings reflects selectedTemplateId updated by updateSettings');

        // Test updateSettings with invalid template ID: must resolve to default and not persist invalid ID
        const classicInAppDb = await db.templates.where('name').equals(BUILT_IN_TEMPLATE_NAMES.CLASSIC).first();
        await updateSettings({ selectedTemplateId: 99999 });
        assert(getSettings().selectedTemplateId === classicInAppDb.id, 'updateSettings with nonexistent ID resolves to default template ID');
        const dbConfigAfterInvalidUpdate = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
        assert(dbConfigAfterInvalidUpdate.value.selectedTemplateId === classicInAppDb.id, 'updateSettings with nonexistent ID persists default template to DB');

        // Test updateSettings partial update: omitting selectedTemplateId preserves existing selection
        await setSelectedTemplateId(modernInAppDb.id);
        await updateSettings({ display: { showTaxBreakup: true } });
        assert(getSettings().selectedTemplateId === modernInAppDb.id, 'updateSettings without selectedTemplateId preserves existing selection');

        // Test setSelectedTemplateId with nonexistent ID: resolves to default template
        await setSelectedTemplateId(77777);
        assert(getSelectedTemplateId() === classicInAppDb.id, 'setSelectedTemplateId with invalid ID resolves to default template');
        const dbConfigAfterInvalidSet = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
        assert(dbConfigAfterInvalidSet.value.selectedTemplateId === classicInAppDb.id, 'setSelectedTemplateId persists resolved fallback to DB');
    }

    // Repaired settings persistence: corrupt selectedTemplateId in db.settings, verify loadSettingsFromDb persists repair
    const rawConfig = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
    rawConfig.value.selectedTemplateId = 88888; // Non-existent ID
    await db.settings.put(rawConfig);

    // Hydrate settings
    const repairedSettings = await loadSettingsFromDb();
    const classicInAppDb = await db.templates.where('name').equals(BUILT_IN_TEMPLATE_NAMES.CLASSIC).first();
    assert(repairedSettings.selectedTemplateId === classicInAppDb.id, 'loadSettingsFromDb repairs in-memory selection');

    // Confirm that the repair was persisted to IndexedDB
    const persistedConfig = await db.settings.get(STORAGE_KEYS.APP_CONFIG);
    assert(persistedConfig.value.selectedTemplateId === classicInAppDb.id, 'Repaired selectedTemplateId was persisted to IndexedDB');

    // Reset settings restores default template
    await resetSettings();
    assert(getSelectedTemplateId() === classicInAppDb.id, 'resetSettings restores selectedTemplateId to Classic');

    // =========================================================================
    // 6. TESTING GETDEFAULTTEMPLATE LOOKUP PRIORITY
    // =========================================================================
    console.log('\n--- 6. Testing getDefaultTemplate Lookup Priority ---');

    const priorityDbName = 'TestPriorityDB_' + Date.now();
    const priorityDb = new Dexie(priorityDbName);
    priorityDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA
    });
    await priorityDb.open();

    // Priority 4: Empty templates store returns null
    const emptyResult = await getDefaultTemplate(priorityDb);
    assert(emptyResult === null, 'Priority 4: Empty store returns null safely');

    // Priority 3: When neither isDefault nor Classic exists, returns first available
    await priorityDb.table(TABLE_NAMES.TEMPLATES).add({
        name: 'Custom Template A',
        isDefault: false,
        isBuiltIn: false
    });
    await priorityDb.table(TABLE_NAMES.TEMPLATES).add({
        name: 'Custom Template B',
        isDefault: false,
        isBuiltIn: false
    });
    const firstAvailable = await getDefaultTemplate(priorityDb);
    assert(firstAvailable !== null && firstAvailable.name === 'Custom Template A', 'Priority 3: Returns first available template when no isDefault or Classic exists');

    // Priority 2: When Classic exists (with isDefault: false), it takes precedence over general non-default templates
    await priorityDb.table(TABLE_NAMES.TEMPLATES).add({
        name: BUILT_IN_TEMPLATE_NAMES.CLASSIC,
        isDefault: false,
        isBuiltIn: true
    });
    const classicFallbackResult = await getDefaultTemplate(priorityDb);
    assert(classicFallbackResult !== null && classicFallbackResult.name === BUILT_IN_TEMPLATE_NAMES.CLASSIC, 'Priority 2: Classic is used as fallback when no isDefault exists');

    // Priority 1: When another template is explicitly marked isDefault: true, it takes precedence OVER Classic
    await priorityDb.table(TABLE_NAMES.TEMPLATES).add({
        name: 'Design Default Non-Classic',
        isDefault: true,
        isBuiltIn: false
    });
    const explicitDefaultResult = await getDefaultTemplate(priorityDb);
    assert(explicitDefaultResult !== null && explicitDefaultResult.name === 'Design Default Non-Classic', 'Priority 1: Explicit isDefault === true takes precedence over Classic');

    // Defensive check
    assert(await getDefaultTemplate(null) === null, 'getDefaultTemplate safely returns null when dbInstance is null');
    assert(await getDefaultTemplate({}) === null, 'getDefaultTemplate safely returns null when dbInstance has no templates table');

    priorityDb.close();
    await Dexie.delete(priorityDbName);

    // =========================================================================
    // 7. FULL BACKUP & RESTORE INTEGRATION TESTS
    // =========================================================================
    console.log('\n--- 7. Testing Full Backup & Restore Support for Templates ---');

    // Test 7.1: exportFullBackup includes templates and selectedTemplateId
    const exportResult = await exportFullBackup();
    assert(exportResult.success === true, 'exportFullBackup succeeded');
    assert(exportResult.backup !== undefined, 'exportFullBackup returned backup payload');
    assert(Array.isArray(exportResult.backup.data.templates), 'Backup data includes templates array');
    assert(exportResult.backup.data.templates.length >= 3, 'Backup includes all templates (>= 3)');
    assert(exportResult.backup.data.settings.selectedTemplateId !== undefined, 'Backup settings includes selectedTemplateId');

    // Test 7.2: importFullBackup restores templates and selectedTemplateId
    const customBackupPayload = {
        type: STORAGE_KEYS.FULL_BACKUP_TYPE,
        version: CURRENT_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
            invoices: [],
            clients: [],
            items: [],
            companies: [
                { id: 'comp-1', name: 'Restored Corp', isDefault: true }
            ],
            templates: [
                { id: 101, name: 'Restored Builtin Classic', isDefault: false, isBuiltIn: true, html: '<div>101</div>', css: '' },
                { id: 102, name: 'Restored Custom Modern', isDefault: true, isBuiltIn: false, html: '<div>102</div>', css: '' }
            ],
            settings: {
                validation: { requireInvoiceNumber: true },
                display: { showLogo: true },
                payment: { upiId: 'restored@upi' },
                activeProfileId: 'comp-1',
                selectedTemplateId: 102
            }
        }
    };

    const importResult = await importFullBackup(JSON.stringify(customBackupPayload));
    assert(importResult.success === true, 'importFullBackup succeeded');
    assert(importResult.counts.templates === 2, 'importFullBackup restored exactly 2 templates');

    const restoredTemplates = await db.templates.toArray();
    assert(restoredTemplates.length === 2, 'Templates table has 2 records after restore');
    const restored102 = await db.templates.get(102);
    assert(restored102 !== undefined && restored102.name === 'Restored Custom Modern', 'Restored template 102 found in database');

    const restoredSettings = getSettings();
    assert(restoredSettings.selectedTemplateId === 102, 'Restored settings preserved selectedTemplateId = 102');

    // Test 7.3: Legacy backup import without templates property remains compatible
    const legacyBackupPayload = {
        type: STORAGE_KEYS.FULL_BACKUP_TYPE,
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
            invoices: [
                { id: 'inv-legacy-1', number: 'INV-LEGACY', IsGST: false, IsIGST: false, items: [] }
            ],
            clients: [],
            items: [],
            companies: [
                { id: 'comp-legacy', name: 'Legacy Corp', isDefault: true }
            ],
            settings: {
                validation: { requireInvoiceNumber: true },
                display: { showLogo: false },
                payment: { upiId: 'legacy@upi' },
                activeProfileId: 'comp-legacy'
            }
            // Notice: no 'templates' property in data!
        }
    };

    const legacyImportResult = await importFullBackup(JSON.stringify(legacyBackupPayload));
    assert(legacyImportResult.success === true, 'Legacy backup import succeeded');
    const templatesAfterLegacyImport = await db.templates.toArray();
    assert(templatesAfterLegacyImport.length > 0, 'Templates were preserved/seeded after legacy backup restore');

    const settingsAfterLegacyImport = getSettings();
    assert(settingsAfterLegacyImport.selectedTemplateId !== null && settingsAfterLegacyImport.selectedTemplateId !== undefined, 'selectedTemplateId was safely resolved after legacy backup restore');

    // Test 7.4: Backup restore with invalid selectedTemplateId safely repairs
    const invalidSelectionBackup = {
        type: STORAGE_KEYS.FULL_BACKUP_TYPE,
        version: CURRENT_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
            invoices: [],
            clients: [],
            items: [],
            companies: [{ id: 'comp-1', name: 'Corp', isDefault: true }],
            templates: [
                { id: 501, name: 'Template 501', isDefault: true, isBuiltIn: true, html: '<div>501</div>', css: '' }
            ],
            settings: {
                validation: {},
                display: {},
                payment: {},
                activeProfileId: 'comp-1',
                selectedTemplateId: 99999 // Invalid reference
            }
        }
    };

    const invalidRestoreResult = await importFullBackup(JSON.stringify(invalidSelectionBackup));
    assert(invalidRestoreResult.success === true, 'Import with invalid selectedTemplateId succeeded');
    const settingsAfterInvalidRestore = getSettings();
    assert(settingsAfterInvalidRestore.selectedTemplateId === 501, 'Invalid selectedTemplateId was repaired to default template ID (501)');

    // =========================================================================
    // 8. TEMPLATE CONTENT VALIDATION TESTS (Finding 5)
    // =========================================================================
    console.log('\n--- 8. Testing Template Content Validation (Finding 5) ---');

    let threwNull = false;
    try {
        validateTemplate(null);
    } catch (e) {
        threwNull = e instanceof TypeError;
    }
    assert(threwNull, 'validateTemplate throws TypeError for null');

    let threwEmptyName = false;
    try {
        validateTemplate({ name: '   ', html: '<div></div>' });
    } catch (e) {
        threwEmptyName = e.message.includes('name is required');
    }
    assert(threwEmptyName, 'validateTemplate throws error for whitespace-only name');

    let threwEmptyHtml = false;
    try {
        validateTemplate({ name: 'Clean Name', html: '   ' });
    } catch (e) {
        threwEmptyHtml = e.message.includes('HTML is required');
    }
    assert(threwEmptyHtml, 'validateTemplate throws error for whitespace-only HTML');

    const sanitizedTpl = validateTemplate({
        name: '  Modern Invoice  ',
        html: '<div class="inv"></div>',
        isDefault: 1,
        isBuiltIn: 0
    });
    assert(sanitizedTpl.name === 'Modern Invoice', 'validateTemplate trims template name');
    assert(sanitizedTpl.isDefault === true, 'validateTemplate coerces isDefault to boolean');
    assert(sanitizedTpl.isBuiltIn === false, 'validateTemplate coerces isBuiltIn to boolean');
    assert(sanitizedTpl.css === '', 'validateTemplate defaults missing css to empty string');

    let saveRejected = false;
    try {
        await saveTemplateAsync({ name: 'No HTML' }, v2Db);
    } catch {
        saveRejected = true;
    }
    assert(saveRejected, 'saveTemplateAsync rejects invalid template without HTML');

    // =========================================================================
    // 9. DEFAULT TEMPLATE UNIQUENESS & SEEDING PROTECTION (Findings 1 & 4)
    // =========================================================================
    console.log('\n--- 9. Testing Default Template Uniqueness & Seeding Protection (Findings 1 & 4) ---');

    const uniquenessDbName = 'TestUniquenessDB_' + Date.now();
    const uDb = new Dexie(uniquenessDbName);
    uDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA,
        [TABLE_NAMES.SETTINGS]: 'key'
    });
    await uDb.open();

    // 9.1 Insert a custom template marked as default before seeding
    const customAlphaId = await saveTemplateAsync({
        name: 'Custom Alpha',
        html: '<div>alpha</div>',
        css: '',
        isDefault: true,
        isBuiltIn: false
    }, uDb);

    // Seed built-in templates into uDb
    await seedBuiltInTemplates(uDb);

    const alphaAfterSeed = await uDb.table(TABLE_NAMES.TEMPLATES).get(customAlphaId);
    assert(alphaAfterSeed.isDefault === true, 'Existing custom default is preserved during built-in template seeding');

    const classicAfterSeed = await uDb.table(TABLE_NAMES.TEMPLATES).where('name').equals(DEFAULT_BUILT_IN_TEMPLATE_NAME).first();
    assert(classicAfterSeed.isDefault === false, 'Classic is seeded with isDefault = false when another default already exists');

    const defaultsCountAfterSeed = await uDb.table(TABLE_NAMES.TEMPLATES).filter(t => Boolean(t.isDefault)).count();
    assert(defaultsCountAfterSeed === 1, 'Exactly one template in the database has isDefault = true after seeding');

    // 9.2 Saving another template with isDefault = true automatically clears previous default
    const customBetaId = await saveTemplateAsync({
        name: 'Custom Beta',
        html: '<div>beta</div>',
        css: '',
        isDefault: true,
        isBuiltIn: false
    }, uDb);

    const betaRecord = await uDb.table(TABLE_NAMES.TEMPLATES).get(customBetaId);
    const alphaRecordAfterBeta = await uDb.table(TABLE_NAMES.TEMPLATES).get(customAlphaId);
    assert(betaRecord.isDefault === true, 'Custom Beta saved with isDefault = true');
    assert(alphaRecordAfterBeta.isDefault === false, 'Custom Alpha isDefault cleared when Custom Beta became default');

    const defaultsAfterBeta = await uDb.table(TABLE_NAMES.TEMPLATES).filter(t => Boolean(t.isDefault)).count();
    assert(defaultsAfterBeta === 1, 'Exactly one template is default after saveTemplateAsync');

    // 9.3 setDefaultTemplateAsync designates single default
    await setDefaultTemplateAsync(classicAfterSeed.id, uDb);
    const classicAfterSet = await uDb.table(TABLE_NAMES.TEMPLATES).get(classicAfterSeed.id);
    const betaAfterSet = await uDb.table(TABLE_NAMES.TEMPLATES).get(customBetaId);
    assert(classicAfterSet.isDefault === true, 'setDefaultTemplateAsync set Classic as default');
    assert(betaAfterSet.isDefault === false, 'setDefaultTemplateAsync cleared isDefault on Custom Beta');

    // 9.4 Reconcile multiple defaults if artificially created
    await uDb.table(TABLE_NAMES.TEMPLATES).update(customBetaId, { isDefault: true });
    const preReconcileDefaults = await uDb.table(TABLE_NAMES.TEMPLATES).filter(t => Boolean(t.isDefault)).count();
    assert(preReconcileDefaults === 2, 'Artificially introduced dual defaults for reconciliation test');

    await seedBuiltInTemplates(uDb);
    const postReconcileDefaults = await uDb.table(TABLE_NAMES.TEMPLATES).filter(t => Boolean(t.isDefault)).count();
    assert(postReconcileDefaults === 1, 'seedBuiltInTemplates successfully reconciled multiple defaults to exactly one');

    await uDb.close();

    // =========================================================================
    // 10. BACKUP RESTORATION WITH NULL/MISSING SETTINGS (Finding 2)
    // =========================================================================
    console.log('\n--- 10. Testing Backup Restoration with Null Settings (Finding 2) ---');

    // Set a distinct stale property in settings before restoring
    await updateSettings({
        payment: { upiId: 'stale-pre-restore@upi', payeeName: 'Stale Payee' }
    });
    const preRestoreSettings = getSettings();
    assert(preRestoreSettings.payment.upiId === 'stale-pre-restore@upi', 'Stale UPI setting established before restore');

    const nullSettingsBackup = {
        type: STORAGE_KEYS.FULL_BACKUP_TYPE,
        version: CURRENT_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
            invoices: [
                { id: 801, number: 'INV-REST-01', IsGST: false, IsIGST: false, items: [], recipient: { name: 'Restored Co' } }
            ],
            clients: [],
            items: [],
            companies: [{ id: 'comp-restored', name: 'Restored Company', isDefault: true }],
            templates: [
                { id: 601, name: 'Restored Template', isDefault: true, isBuiltIn: false, html: '<div>R</div>', css: '' }
            ],
            settings: null // Explicitly null settings
        }
    };

    const nullSettingsRestoreResult = await importFullBackup(JSON.stringify(nullSettingsBackup));
    assert(nullSettingsRestoreResult.success === true, 'importFullBackup succeeded with settings: null');

    const postNullRestoreSettings = getSettings();
    assert(
        postNullRestoreSettings.payment.upiId === '',
        'Stale UPI setting from pre-restore dataset was wiped clean'
    );
    assert(
        postNullRestoreSettings.activeProfileId === 'comp-restored',
        'Restored sensible default settings assigned activeProfileId to restored company'
    );
    assert(
        postNullRestoreSettings.selectedTemplateId === 601,
        'Restored sensible default settings resolved selectedTemplateId to valid restored template (601)'
    );

    // =========================================================================
    // 11. BACKUP SERIALIZATION AND DOWNLOAD FLAGS (Finding 3)
    // =========================================================================
    console.log('\n--- 11. Testing Backup Serialization & Download Flags (Finding 3) ---');

    const backupDataPayload = await createFullBackupData(db);
    assert(backupDataPayload.type === STORAGE_KEYS.FULL_BACKUP_TYPE, 'createFullBackupData returns valid backup type');
    assert(Array.isArray(backupDataPayload.data.invoices), 'createFullBackupData contains invoices array');
    assert(Array.isArray(backupDataPayload.data.templates), 'createFullBackupData contains templates array');
    assert(backupDataPayload.data.settings !== undefined, 'createFullBackupData contains settings section');

    const exportStatus = await exportFullBackup();
    assert(exportStatus.success === true, 'exportFullBackup returns success: true');
    assert(exportStatus.downloaded === false, 'exportFullBackup accurately reports downloaded = false in Node.js environment');
    assert(exportStatus.backup !== undefined, 'exportFullBackup returns backup payload');

    // =========================================================================
    // 12. ATOMIC DELETION OF SELECTED AND DEFAULT TEMPLATES (Finding 6)
    // =========================================================================
    console.log('\n--- 12. Testing Atomic Deletion of Selected and Default Templates (Finding 6) ---');

    const atomicDelDbName = 'TestAtomicDelDB_' + Date.now();
    const aDb = new Dexie(atomicDelDbName);
    aDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA,
        [TABLE_NAMES.SETTINGS]: 'key'
    });
    await aDb.open();

    const tpl1Id = await saveTemplateAsync({ name: 'Template 1', html: '<div>1</div>', isDefault: true }, aDb);
    const tpl2Id = await saveTemplateAsync({ name: 'Template 2', html: '<div>2</div>', isDefault: false }, aDb);

    await aDb.settings.put({
        key: STORAGE_KEYS.APP_CONFIG,
        value: { selectedTemplateId: tpl1Id }
    });

    // Delete tpl1 which is currently selected AND default
    const delResult = await deleteTemplateAsync(tpl1Id, aDb);
    assert(delResult === true, 'deleteTemplateAsync returned true');

    const deletedTpl = await aDb.templates.get(tpl1Id);
    assert(deletedTpl === undefined, 'Template 1 successfully deleted from templates store');

    const atomicDelSettingsRecord = await aDb.settings.get(STORAGE_KEYS.APP_CONFIG);
    assert(
        atomicDelSettingsRecord.value.selectedTemplateId === tpl2Id,
        'selectedTemplateId was atomically reassigned to fallback template (tpl2)'
    );

    const remainingTpl2 = await aDb.templates.get(tpl2Id);
    assert(remainingTpl2.isDefault === true, 'Remaining template was atomically designated as default');

    await aDb.close();

    // =========================================================================
    // 13. FULL INTEGRATION TEST OF APPLICATION INITIALIZATION ON V1 DB (Finding 7)
    // =========================================================================
    console.log('\n--- 13. Testing Application Initialization Integration on v1 Database (Finding 7) ---');

    const integrationDbName = 'TestIntegrationInitDB_' + Date.now();
    const v1IntegrationDb = new Dexie(integrationDbName);
    v1IntegrationDb.version(1).stores({
        [TABLE_NAMES.INVOICES]: 'id, number, date, IsGST, IsIGST, template, recipient.name, recipient.gstNumber',
        [TABLE_NAMES.CLIENTS]: 'id, name, mobile, email, gstNumber, createdAt',
        [TABLE_NAMES.ITEMS]: 'id, name, hsnSac, defaultPrice, createdAt',
        [TABLE_NAMES.COMPANIES]: 'id, name, gstNumber, isDefault',
        [TABLE_NAMES.SETTINGS]: 'key'
    });
    await v1IntegrationDb.open();

    await v1IntegrationDb.table(TABLE_NAMES.INVOICES).add({
        id: 'inv-init-v1',
        number: 'INV-INIT-101',
        date: '2026-02-01',
        IsGST: true,
        IsIGST: false,
        template: 'classic',
        recipient: { name: 'Integration Customer', gstNumber: '' }
    });

    await v1IntegrationDb.table(TABLE_NAMES.SETTINGS).put({
        key: STORAGE_KEYS.APP_CONFIG,
        value: {
            validation: { requireInvoiceNumber: true },
            display: { showLogo: true },
            payment: { upiId: 'init@upi' },
            activeProfileId: 'default'
            // selectedTemplateId not present in v1
        }
    });

    await v1IntegrationDb.close();

    // Open through the actual InvoiceAppDatabase subclass with v2 schema
    const v2IntegrationAppDb = new InvoiceAppDatabase(integrationDbName);
    await v2IntegrationAppDb.open();

    assert(v2IntegrationAppDb.verno === 2, 'InvoiceAppDatabase auto-upgraded existing v1 database to version 2');

    // Run the actual template seeding flow on this migrated database
    const integrationSeedResult = await seedBuiltInTemplates(v2IntegrationAppDb);
    assert(integrationSeedResult.seededCount === 3, 'Seeded all 3 built-in templates into upgraded database');

    const preservedInvoice = await v2IntegrationAppDb.invoices.get('inv-init-v1');
    assert(preservedInvoice !== undefined && preservedInvoice.number === 'INV-INIT-101', 'Existing v1 invoice preserved intact');

    const appConfigAfterUpgrade = await v2IntegrationAppDb.settings.get(STORAGE_KEYS.APP_CONFIG);
    assert(appConfigAfterUpgrade.value.payment.upiId === 'init@upi', 'Existing v1 settings preserved intact');
    assert(appConfigAfterUpgrade.value.selectedTemplateId !== undefined, 'selectedTemplateId populated during template seeding');

    const activeTemplate = await v2IntegrationAppDb.templates.get(appConfigAfterUpgrade.value.selectedTemplateId);
    assert(activeTemplate.name === DEFAULT_BUILT_IN_TEMPLATE_NAME, 'selectedTemplateId references seeded Classic template');

    await v2IntegrationAppDb.close();

    // =========================================================================
    // 14. DELETION POLICY WHEN REFERENCED BY INVOICES (Finding 2)
    // =========================================================================
    console.log('\n--- 14. Testing Deletion Policy When Referenced by Invoices (Finding 2) ---');

    const invDelDbName = 'TestInvDelDB_' + Date.now();
    const invDelDb = new Dexie(invDelDbName);
    invDelDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA,
        [TABLE_NAMES.INVOICES]: 'id, number, template',
        [TABLE_NAMES.SETTINGS]: 'key'
    });
    await invDelDb.open();

    const usedTplId = await saveTemplateAsync({ name: 'Active Layout', html: '<div>Active</div>', isDefault: false }, invDelDb);
    const fallbackTplId = await saveTemplateAsync({ name: 'Fallback Layout', html: '<div>Fallback</div>', isDefault: true }, invDelDb);

    // Create 2 invoices referencing usedTplId (one numeric, one string)
    await invDelDb.invoices.put({ id: 'inv-1', number: 'INV-001', template: usedTplId });
    await invDelDb.invoices.put({ id: 'inv-2', number: 'INV-002', template: String(usedTplId) });

    // Attempting to delete should fail and be prevented
    let threwInUse = false;
    try {
        await deleteTemplateAsync(usedTplId, invDelDb);
    } catch (err) {
        threwInUse = true;
        assert(err.message.includes('currently referenced by 2 invoice(s)'), 'Rejection error states invoice reference count');
    }
    assert(threwInUse, 'deleteTemplateAsync prevents deletion when referenced by invoices');

    // Verify template was NOT deleted
    const stillExists = await invDelDb.templates.get(usedTplId);
    assert(stillExists !== undefined, 'Template record was preserved in Dexie');

    // Deletion with reassignInvoicesTo atomically reassigns invoices and deletes template
    const reassignResult = await deleteTemplateAsync(usedTplId, invDelDb, { reassignInvoicesTo: fallbackTplId });
    assert(reassignResult === true, 'deleteTemplateAsync succeeds when reassignInvoicesTo option is provided');

    const afterReassignDeleted = await invDelDb.templates.get(usedTplId);
    assert(afterReassignDeleted === undefined, 'Target template is now deleted');

    const updatedInv1 = await invDelDb.invoices.get('inv-1');
    const updatedInv2 = await invDelDb.invoices.get('inv-2');
    assert(updatedInv1.template === fallbackTplId, 'Invoice 1 reassigned to fallback template');
    assert(updatedInv2.template === fallbackTplId, 'Invoice 2 reassigned to fallback template');

    await invDelDb.close();

    // =========================================================================
    // 15. DELETION & DEFAULT REASSIGNMENT LIFECYCLE (Finding 4)
    // =========================================================================
    console.log('\n--- 15. Testing Deletion & Default Reassignment Lifecycle (Finding 4) ---');

    const lifecycleDbName = 'TestLifecycleDB_' + Date.now();
    const lDb = new Dexie(lifecycleDbName);
    lDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA,
        [TABLE_NAMES.SETTINGS]: 'key'
    });
    await lDb.open();

    // Scenario A: Non-default deletion
    const nonDefTpl = await saveTemplateAsync({ name: 'Secondary Theme', html: '<div>2</div>', isDefault: false }, lDb);
    const defTpl = await saveTemplateAsync({ name: 'Primary Theme', html: '<div>1</div>', isDefault: true }, lDb);

    await deleteTemplateAsync(nonDefTpl, lDb);
    const defAfterNonDefDel = await lDb.templates.get(defTpl);
    assert(defAfterNonDefDel.isDefault === true, 'Deleting non-default template leaves default unchanged');

    // Scenario B: Deleting default when Classic is unavailable -> reassigns first remaining
    await lDb.templates.clear();
    const alphaId = await saveTemplateAsync({ name: 'Alpha Custom', html: '<div>A</div>', isDefault: true }, lDb);
    const betaId = await saveTemplateAsync({ name: 'Beta Custom', html: '<div>B</div>', isDefault: false }, lDb);

    await deleteTemplateAsync(alphaId, lDb);
    const betaAfterAlphaDel = await lDb.templates.get(betaId);
    assert(betaAfterAlphaDel.isDefault === true, 'Deleting default when Classic unavailable reassigns first remaining');

    // Scenario C: Deleting the only remaining template
    const onlyDelResult = await deleteTemplateAsync(betaId, lDb);
    assert(onlyDelResult === true, 'Deleting only remaining template succeeds cleanly');
    const remainingCount = await lDb.templates.count();
    assert(remainingCount === 0, 'Templates store is empty without crash');

    await lDb.close();

    // =========================================================================
    // 16. DUPLICATE NAME PERSISTENCE & CONCURRENCY (Finding 5)
    // =========================================================================
    console.log('\n--- 16. Testing Duplicate Name Persistence & Concurrency (Finding 5) ---');

    const dupDbName = 'TestDupDB_' + Date.now();
    const dupDb = new Dexie(dupDbName);
    dupDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA
    });
    await dupDb.open();

    await saveTemplateAsync({ name: 'Modern Minimal', html: '<div>1</div>' }, dupDb);

    // Exact duplicate
    let exactFailed = false;
    try {
        await saveTemplateAsync({ name: 'Modern Minimal', html: '<div>2</div>' }, dupDb);
    } catch (err) {
        exactFailed = true;
        assert(err.message.includes('already exists'), 'saveTemplateAsync rejects exact duplicate name');
    }
    assert(exactFailed, 'Exact duplicate name threw error in saveTemplateAsync');

    // Case-insensitive duplicate
    let caseFailed = false;
    try {
        await saveTemplateAsync({ name: 'MODERN MINIMAL', html: '<div>3</div>' }, dupDb);
    } catch (err) {
        caseFailed = true;
        assert(err.message.includes('already exists'), 'saveTemplateAsync rejects uppercase duplicate name');
    }
    assert(caseFailed, 'Case-insensitive duplicate name threw error in saveTemplateAsync');

    // Whitespace variation
    let wsFailed = false;
    try {
        await saveTemplateAsync({ name: '   Modern Minimal   ', html: '<div>4</div>' }, dupDb);
    } catch (err) {
        wsFailed = true;
        assert(err.message.includes('already exists'), 'saveTemplateAsync rejects whitespace-padded duplicate name');
    }
    assert(wsFailed, 'Whitespace-padded duplicate name threw error in saveTemplateAsync');

    // Concurrent saves with same name
    let concurrentSuccesses = 0;
    let concurrentFailures = 0;
    const concurrentResults = await Promise.allSettled([
        saveTemplateAsync({ name: 'Concurrent Test', html: '<div>C1</div>' }, dupDb),
        saveTemplateAsync({ name: 'Concurrent Test', html: '<div>C2</div>' }, dupDb)
    ]);
    concurrentResults.forEach(r => {
        if (r.status === 'fulfilled') concurrentSuccesses++;
        if (r.status === 'rejected') concurrentFailures++;
    });
    assert(concurrentSuccesses === 1, 'Exactly one concurrent save with identical name succeeded');
    assert(concurrentFailures === 1, 'Concurrent collision was rejected');

    // Updating existing template with same name succeeds
    const existingToUpdate = await dupDb.templates.where('name').equals('Modern Minimal').first();
    const updateResult = await saveTemplateAsync({ id: existingToUpdate.id, name: 'Modern Minimal', html: '<div>Updated</div>' }, dupDb);
    assert(updateResult === existingToUpdate.id, 'Self-update with same template name succeeds');

    await dupDb.close();

    // =========================================================================
    // 17. SEEDING RECONCILIATION & METADATA PRESERVATION (Finding 7)
    // =========================================================================
    console.log('\n--- 17. Testing Seeding Reconciliation & Metadata Preservation (Finding 7) ---');

    const seedRecDbName = 'TestSeedRecDB_' + Date.now();
    const srDb = new Dexie(seedRecDbName);
    srDb.version(1).stores({
        [TABLE_NAMES.TEMPLATES]: TEMPLATE_SCHEMA,
        [TABLE_NAMES.SETTINGS]: 'key'
    });
    await srDb.open();

    // Insert legacy built-in record lacking key and isBuiltIn, with customized HTML
    const customClassicHtml = '<div>User Customized Classic HTML</div>';
    const legacyRecordId = await srDb.templates.add({
        name: DEFAULT_BUILT_IN_TEMPLATE_NAME,
        html: customClassicHtml,
        css: '/* user css */',
        isDefault: true,
        updatedAt: new Date('2025-01-01')
    });

    const seedRecResult = await seedBuiltInTemplates(srDb);
    assert(seedRecResult.existingCount >= 1, 'seedBuiltInTemplates recognized legacy existing template');

    const reconciledRecord = await srDb.templates.get(legacyRecordId);
    assert(reconciledRecord.key === 'classic', 'Reconciled missing key to "classic"');
    assert(reconciledRecord.isBuiltIn === true, 'Reconciled missing isBuiltIn to true');
    assert(reconciledRecord.html === customClassicHtml, 'User customized HTML was strictly preserved');
    assert(reconciledRecord.css === '/* user css */', 'User customized CSS was strictly preserved');

    // Run seedBuiltInTemplates again (idempotence verification)
    const secondSeedResult = await seedBuiltInTemplates(srDb);
    assert(secondSeedResult.seededCount === 0, 'Second run seeded 0 additional templates (idempotent)');

    await srDb.close();

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Unhandled test failure in templateService.test.js:', err);
    process.exit(1);
});
