import 'fake-indexeddb/auto';
import { db } from '../db/db.js';
import { STORAGE_KEYS } from '../constants/index.js';
import {
    initializeDatabaseAndMigrate,
    transformInvoiceForDexie
} from './migrationService.js';
import { saveInvoice, getInvoice, deleteInvoice } from './invoiceService.js';
import { getAllClientsAsync } from './clientService.js';

console.log('Running Dexie & GST Migration Service Tests...');

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

// Simple in-memory localStorage polyfill for testing in Node
class LocalStorageMock {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] || null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

globalThis.localStorage = new LocalStorageMock();

async function runAllTests() {
    // ==========================================
    // 1. TRANSFORM INVOICE & GST STANDARDIZATION TESTS
    // ==========================================
    console.log('\n--- 1. Testing transformInvoiceForDexie ---');

    // Test 1.1: Standardize isGST: true -> IsGST: true
    const t1 = transformInvoiceForDexie({
        id: 1,
        number: 'INV-1',
        isGST: true,
        isIGST: false
    });
    assert(t1.IsGST === true, 'isGST: true standardized to IsGST: true');
    assert(t1.IsIGST === false, 'isIGST: false standardized to IsIGST: false');
    assert(t1.isGST === undefined, 'Legacy isGST property strictly deleted');
    assert(t1.isIGST === undefined, 'Legacy isIGST property strictly deleted');

    // Test 1.2: Standardize isGST: false -> IsGST: false (strict boolean preservation)
    const t2 = transformInvoiceForDexie({
        id: 2,
        number: 'INV-2',
        isGST: false
    });
    assert(t2.IsGST === false, 'Explicit isGST: false strictly preserved as IsGST: false');
    assert(t2.IsIGST === false, 'IsIGST defaulted to false');
    assert(t2.isGST === undefined, 'Legacy isGST property deleted');

    // Test 1.3: Interstate IGST with GST enabled
    const t3 = transformInvoiceForDexie({
        id: 3,
        number: 'INV-3',
        isGST: true,
        isIGST: true
    });
    assert(t3.IsGST === true && t3.IsIGST === true, 'Both IsGST and IsIGST are true');

    // Test 1.4: Invariant enforcement: isIGST: true with isGST: false
    const t4 = transformInvoiceForDexie({
        id: 4,
        number: 'INV-4',
        isGST: false,
        isIGST: true
    });
    assert(t4.IsGST === false, 'IsGST is false');
    assert(t4.IsIGST === false, 'Invariant enforced: IsIGST forced to false when IsGST is false');

    // Test 1.5: Deterministic Conflict Resolution (canonical IsGST takes precedence)
    const t5 = transformInvoiceForDexie({
        id: 5,
        number: 'INV-5',
        isGST: false,
        IsGST: true,
        isIGST: true,
        taxEnabled: true,
        gst: true
    });
    assert(t5.IsGST === true, 'Canonical IsGST: true overrides conflicting legacy isGST: false');
    assert(t5.IsIGST === true, 'IsIGST is true');
    assert(t5.taxEnabled === undefined, 'Legacy taxEnabled property deleted');
    assert(t5.gst === undefined, 'Legacy gst property deleted');

    // Test 1.6: Preserves existing ID and generates UUID if missing
    const t6 = transformInvoiceForDexie({
        number: 'INV-6',
        items: []
    });
    assert(typeof t6.id === 'string' && t6.id.length > 10, 'Generated unique UUID when ID is missing');

    // ==========================================
    // 2. LOCALSTORAGE TO DEXIE ATOMIC MIGRATION
    // ==========================================
    console.log('\n--- 2. Testing initializeDatabaseAndMigrate ---');

    // Set up legacy mock data in localStorage
    const legacyInvoices = [
        {
            id: 1001,
            number: 'INV-LEGACY-01',
            date: '2026-01-01',
            isGST: true,
            isIGST: false,
            recipient: { name: 'Acme Corp' },
            items: [{ id: 1, description: 'Item 1', quantity: 2, price: 500 }]
        },
        {
            id: 1002,
            number: 'INV-LEGACY-02',
            date: '2026-01-02',
            isGST: false,
            recipient: { name: 'Beta Ltd' },
            items: [{ id: 1, description: 'Item 2', quantity: 1, price: 1000 }]
        }
    ];

    const legacyClients = [
        { id: 1, name: 'Acme Corp', mobile: '9876543210', email: 'acme@example.com' },
        { id: 2, name: 'Beta Ltd', mobile: '9123456780', email: 'beta@example.com' }
    ];

    const legacyItems = [
        { id: 1, name: 'Consulting', defaultPrice: 500, hsnSac: '9983' }
    ];

    localStorage.setItem(STORAGE_KEYS.LEGACY_INVOICE_KEY, JSON.stringify(legacyInvoices));
    localStorage.setItem(STORAGE_KEYS.LEGACY_CLIENT_KEY, JSON.stringify(legacyClients));
    localStorage.setItem(STORAGE_KEYS.LEGACY_ITEM_KEY, JSON.stringify(legacyItems));

    // Execute migration
    const migResult = await initializeDatabaseAndMigrate();
    assert(migResult.success === true, 'Migration returned success = true');
    assert(migResult.invoicesMigrated === 2, 'Migrated exactly 2 legacy invoices');
    assert(migResult.clientsMigrated === 2, 'Migrated exactly 2 legacy clients');
    assert(migResult.itemsMigrated === 1, 'Migrated exactly 1 legacy item');

    // Verify Dexie table records
    const dexieInvoices = await db.invoices.toArray();
    assert(dexieInvoices.length === 2, 'Dexie invoices table has 2 records');

    const inv1 = dexieInvoices.find(i => i.number === 'INV-LEGACY-01');
    assert(inv1.IsGST === true, 'Dexie inv1 has IsGST: true');
    assert(inv1.IsIGST === false, 'Dexie inv1 has IsIGST: false');
    assert(inv1.isGST === undefined, 'Dexie inv1 has no legacy isGST property');

    const inv2 = dexieInvoices.find(i => i.number === 'INV-LEGACY-02');
    assert(inv2.IsGST === false, 'Dexie inv2 has IsGST: false strictly preserved');
    assert(inv2.isGST === undefined, 'Dexie inv2 has no legacy isGST property');

    // Verify localStorage markers & backups
    assert(localStorage.getItem(STORAGE_KEYS.MIGRATION_MARKER) === 'true', 'Migration marker set in localStorage');
    assert(localStorage.getItem(STORAGE_KEYS.BACKUP_PRE_DEXIE) !== null, 'Pre-dexie backup stored safely in localStorage');

    // ==========================================
    // 3. IDEMPOTENCE & DUPLICATE PREVENTION
    // ==========================================
    console.log('\n--- 3. Testing Migration Idempotence ---');

    const secondRun = await initializeDatabaseAndMigrate();
    assert(secondRun.alreadyMigrated === true, 'Second run detects alreadyMigrated = true');

    const dexieInvoicesAfter = await db.invoices.toArray();
    assert(dexieInvoicesAfter.length === 2, 'Record count is identical (0 duplicates created)');

    // ==========================================
    // 4. DEXIE ASYNC CRUD & AUTO-CLIENT UPSERT
    // ==========================================
    console.log('\n--- 4. Testing Dexie CRUD & Transactions ---');

    // Create a new invoice with an un-saved client
    const newInvoice = {
        number: 'INV-NEW-03',
        date: '2026-02-01',
        IsGST: true,
        IsIGST: true,
        recipient: {
            name: 'Gamma Industries',
            mobile: '9998887776',
            address: 'Industrial Area'
        },
        items: []
    };

    const saved = await saveInvoice(newInvoice);
    assert(typeof saved.id === 'string', 'Saved invoice has generated UUID string ID');

    const fetched = await getInvoice(saved.id);
    assert(fetched !== null && fetched.number === 'INV-NEW-03', 'Fetched saved invoice by UUID');

    // Verify auto-upsert of client
    const allClients = await getAllClientsAsync();
    const gammaClient = allClients.find(c => c.name === 'Gamma Industries');
    assert(gammaClient !== undefined, 'Gamma Industries automatically upserted into clients table');
    assert(gammaClient.mobile === '9998887776', 'Client mobile correctly recorded');

    // Numeric ID lookup backward compatibility
    const numericFetched = await getInvoice(1001);
    assert(numericFetched !== null && numericFetched.number === 'INV-LEGACY-01', 'Retrieved legacy invoice with numeric ID 1001');

    // Stringified ID lookup
    const stringFetched = await getInvoice('1001');
    assert(stringFetched !== null && stringFetched.number === 'INV-LEGACY-01', 'Retrieved numeric invoice using stringified ID "1001"');

    // Delete invoice
    const deleteSuccess = await deleteInvoice(saved.id);
    assert(deleteSuccess === true, 'deleteInvoice returned true');
    const afterDelete = await getInvoice(saved.id);
    assert(afterDelete === null, 'Invoice successfully deleted from Dexie');

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runAllTests().catch(err => {
    console.error('Unhandled test failure:', err);
    process.exit(1);
});
