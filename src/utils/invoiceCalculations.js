// Shared invoice calculation helpers to keep subtotal/tax/discount logic consistent

/**
 * Safely parses a numeric value, returning 0 for NaN/undefined/null.
 */
function toNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Calculates subtotal, tax, discount and total values for a given invoice.
 * Assumes invoice has shape similar to what invoiceService / editor use.
 */
export function calculateInvoiceTotals(invoice) {
  if (!invoice) {
    return {
      subtotal: 0,
      taxAmount: 0,
      igstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      preDiscountTotal: 0,
      discountAmount: 0,
      total: 0,
      balance: 0,
    };
  }

  const items = Array.isArray(invoice.items) ? invoice.items : [];

  const subtotal = items.reduce((sum, item) => {
    const quantity = toNumber(item.quantity || 0);
    const price = toNumber(item.price || 0);
    return sum + quantity * price;
  }, 0);

  const taxAmount = invoice.isGST
    ? items.reduce((sum, item) => {
        const quantity = toNumber(item.quantity || 0);
        const price = toNumber(item.price || 0);
        const itemTotal = quantity * price;
        const rawRate = item.gstRate !== undefined ? item.gstRate : 18;
        const rate = toNumber(rawRate);
        return sum + (itemTotal * rate) / 100;
      }, 0)
    : 0;

  const igstAmount = invoice.isGST && invoice.isIGST ? taxAmount : 0;
  const cgstAmount = invoice.isGST && !invoice.isIGST ? taxAmount / 2 : 0;
  const sgstAmount = invoice.isGST && !invoice.isIGST ? taxAmount / 2 : 0;

  const preDiscountTotal = subtotal + taxAmount;

  const discountValue = toNumber(invoice.discountValue || 0);
  const discountAmount =
    invoice.discountType === 'percentage'
      ? (preDiscountTotal * discountValue) / 100
      : discountValue;

  const rawTotal = preDiscountTotal - discountAmount;
  const total = Math.max(0, isNaN(rawTotal) ? 0 : rawTotal);

  const received = toNumber(invoice.received || 0);
  const balance = total - received;

  return {
    subtotal,
    taxAmount,
    igstAmount,
    cgstAmount,
    sgstAmount,
    preDiscountTotal,
    discountAmount,
    total,
    balance,
  };
}

/**
 * Convenience helper to get just the grand total for an invoice.
 */
export function getInvoiceTotal(invoice) {
  return calculateInvoiceTotals(invoice).total;
}

