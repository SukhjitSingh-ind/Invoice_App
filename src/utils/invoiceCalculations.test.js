import { calculateInvoiceTotals, getInvoiceTotal } from './invoiceCalculations.js';

console.log('Running Invoice Calculation Tests...');

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

// Case 1: Standard intra-state GST invoice with fixed discount
const standardInvoice = {
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

const totals1 = calculateInvoiceTotals(standardInvoice);
assert(totals1.subtotal === 400, `Subtotal should be 400, got ${totals1.subtotal}`);
assert(totals1.taxAmount === 60, `Tax Amount should be 60, got ${totals1.taxAmount}`);
assert(totals1.cgstAmount === 30, `CGST should be 30, got ${totals1.cgstAmount}`);
assert(totals1.sgstAmount === 30, `SGST should be 30, got ${totals1.sgstAmount}`);
assert(totals1.igstAmount === 0, `IGST should be 0, got ${totals1.igstAmount}`);
assert(totals1.preDiscountTotal === 460, `Pre-discount Total should be 460, got ${totals1.preDiscountTotal}`);
assert(totals1.discountAmount === 50, `Discount Amount should be 50, got ${totals1.discountAmount}`);
assert(totals1.total === 410, `Total should be 410, got ${totals1.total}`);
assert(totals1.balance === 310, `Balance should be 310, got ${totals1.balance}`);
assert(getInvoiceTotal(standardInvoice) === 410, `getInvoiceTotal should return 410`);

// Case 2: Inter-state IGST invoice with percentage discount
const igstInvoice = {
    items: [
        { price: 500, quantity: 2, gstRate: 18 }
    ],
    isGST: true,
    isIGST: true,
    discountType: 'percentage',
    discountValue: 10, // 10%
    received: 500
};

const totals2 = calculateInvoiceTotals(igstInvoice);
// Subtotal = 1000, Tax = 180, PreDiscount = 1180, Discount = 118, Total = 1062, Balance = 562
assert(totals2.subtotal === 1000, `IGST subtotal should be 1000, got ${totals2.subtotal}`);
assert(totals2.taxAmount === 180, `IGST tax should be 180, got ${totals2.taxAmount}`);
assert(totals2.igstAmount === 180, `IGST amount should equal total tax (180), got ${totals2.igstAmount}`);
assert(totals2.cgstAmount === 0, `CGST should be 0 for interstate, got ${totals2.cgstAmount}`);
assert(totals2.sgstAmount === 0, `SGST should be 0 for interstate, got ${totals2.sgstAmount}`);
assert(totals2.discountAmount === 118, `10% discount should be 118, got ${totals2.discountAmount}`);
assert(totals2.total === 1062, `Total should be 1062, got ${totals2.total}`);
assert(totals2.balance === 562, `Balance should be 562, got ${totals2.balance}`);

// Case 3: Non-GST invoice
const nonGstInvoice = {
    items: [
        { price: 150, quantity: 3 }
    ],
    isGST: false,
    received: 450
};
const totals3 = calculateInvoiceTotals(nonGstInvoice);
assert(totals3.subtotal === 450, `Non-GST subtotal should be 450`);
assert(totals3.taxAmount === 0, `Non-GST tax should be 0`);
assert(totals3.total === 450, `Non-GST total should be 450`);
assert(totals3.balance === 0, `Fully paid balance should be 0`);

// Case 4: Null / Empty edge cases
const emptyTotals = calculateInvoiceTotals(null);
assert(emptyTotals.total === 0, `Null invoice should produce 0 total safely`);
assert(emptyTotals.subtotal === 0, `Null invoice should produce 0 subtotal`);

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
