import { calculateInvoiceTotals } from './invoiceCalculations.js';

console.log('Running Invoice Calculation Tests...');

// Mock Invoice Data
const mockInvoice = {
    items: [
        { price: 100, quantity: 2, gstRate: 18 },
        { price: 200, quantity: 1, gstRate: 12 }
    ],
    isGST: true,
    isIGST: false,
    discountType: 'fixed',
    discountValue: 50,
    received: 100
};

const totals = calculateInvoiceTotals(mockInvoice);

// Tests
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

// Subtotal: (100*2) + (200*1) = 400
assert(totals.subtotal === 400, `Subtotal should be 400, got ${totals.subtotal}`);

// Tax: 
// Item 1: 200 * 18% = 36
// Item 2: 200 * 12% = 24
// Total Tax = 60
assert(totals.taxAmount === 60, `Tax Amount should be 60, got ${totals.taxAmount}`);

// CGST/SGST (intra-state): 60 / 2 = 30 each
assert(totals.cgstAmount === 30, `CGST should be 30, got ${totals.cgstAmount}`);
assert(totals.sgstAmount === 30, `SGST should be 30, got ${totals.sgstAmount}`);

// Pre-discount Total: 400 + 60 = 460
assert(totals.preDiscountTotal === 460, `Pre-discount Total should be 460, got ${totals.preDiscountTotal}`);

// Discount: 50
assert(totals.discountAmount === 50, `Discount Amount should be 50, got ${totals.discountAmount}`);

// Total: 460 - 50 = 410
assert(totals.total === 410, `Total should be 410, got ${totals.total}`);

// Balance: 410 - 100 = 310
assert(totals.balance === 310, `Balance should be 310, got ${totals.balance}`);

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
