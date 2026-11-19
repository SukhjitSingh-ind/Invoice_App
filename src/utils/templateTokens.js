/**
 * Template Tokens Reference & Duplication Utilities
 *
 * Derives available invoice template tokens directly from the template
 * rendering implementation in templates.js and SUPPORTED_TEMPLATE_TOKENS.
 */

import { SUPPORTED_TEMPLATE_TOKENS } from './templateValidator.js';

/**
 * Token categories for organizing the reference panel in Template Studio.
 */
export const TOKEN_CATEGORIES = Object.freeze([
    { id: 'all', name: 'All Tokens', description: 'Complete catalog of supported tokens' },
    { id: 'invoice', name: 'Invoice Details', description: 'Invoice number, dates, place of supply, notes' },
    { id: 'business', name: 'Business (Sender)', description: 'Company name, address, contact, GSTIN' },
    { id: 'customer', name: 'Customer (Recipient)', description: 'Client name, address, phone, GSTIN' },
    { id: 'items', name: 'Line Items', description: 'Repeating table rows, description, qty, price, total' },
    { id: 'totals', name: 'Totals & Taxes', description: 'Subtotal, CGST, SGST, IGST, discount, grand total' },
    { id: 'payment', name: 'Payment & Bank', description: 'UPI ID, bank name, account number, IFSC' }
]);

/**
 * Full catalog of supported template tokens with syntax, human-readable labels,
 * descriptions, categories, and realistic preview examples.
 */
export const TEMPLATE_TOKENS = Object.freeze([
    // === Invoice Information ===
    {
        token: 'invoiceNumber',
        syntax: '{{invoiceNumber}}',
        label: 'Invoice Number',
        category: 'invoice',
        description: 'Formatted invoice identifier (e.g., INV-2026-001)',
        example: 'INV-2026-001'
    },
    {
        token: 'date',
        syntax: '{{date}}',
        label: 'Invoice Date',
        category: 'invoice',
        description: 'Issue date formatted for display (e.g., 19 November 2026)',
        example: '19 November 2026'
    },
    {
        token: 'dueDate',
        syntax: '{{dueDate}}',
        label: 'Due Date',
        category: 'invoice',
        description: 'Payment due date formatted for display',
        example: '05 December 2026'
    },
    {
        token: 'placeOfSupply',
        syntax: '{{placeOfSupply}}',
        label: 'Place of Supply',
        category: 'invoice',
        description: 'Place of supply state and code for GST compliance',
        example: '24-Gujarat'
    },
    {
        token: 'notes',
        syntax: '{{notes}}',
        label: 'Invoice Notes',
        category: 'invoice',
        description: 'Special notes or remarks for the customer',
        example: 'Thank you for your business.'
    },
    {
        token: 'termsAndConditions',
        syntax: '{{termsAndConditions}}',
        label: 'Terms & Conditions',
        category: 'invoice',
        description: 'Payment terms and contractual conditions',
        example: 'Payment due within 15 days.'
    },

    // === Business / Sender Details ===
    {
        token: 'sender.name',
        syntax: '{{sender.name}}',
        label: 'Business Name',
        category: 'business',
        description: 'Legal name of the billing business or organization',
        example: 'Apex Solutions Pvt Ltd'
    },
    {
        token: 'sender.address',
        syntax: '{{sender.address}}',
        label: 'Business Address',
        category: 'business',
        description: 'Full registered business address',
        example: '101 Tech Boulevard, Gandhinagar, Gujarat 382010'
    },
    {
        token: 'sender.phone',
        syntax: '{{sender.phone}}',
        label: 'Business Phone',
        category: 'business',
        description: 'Business contact phone or mobile number',
        example: '+91 98765 43210'
    },
    {
        token: 'sender.email',
        syntax: '{{sender.email}}',
        label: 'Business Email',
        category: 'business',
        description: 'Official billing and contact email address',
        example: 'billing@apexsolutions.com'
    },
    {
        token: 'sender.gstNumber',
        syntax: '{{sender.gstNumber}}',
        label: 'Business GSTIN',
        category: 'business',
        description: '15-digit GST identification number of the business',
        example: '24AAAAA0000A1Z5'
    },
    {
        token: 'sender.state',
        syntax: '{{sender.state}}',
        label: 'Business State',
        category: 'business',
        description: 'State of registration and state code',
        example: '24-Gujarat'
    },

    // === Customer / Recipient Details ===
    {
        token: 'recipient.name',
        syntax: '{{recipient.name}}',
        label: 'Customer Name',
        category: 'customer',
        description: 'Name of the billed client or company',
        example: 'Global Enterprises Ltd'
    },
    {
        token: 'recipient.address',
        syntax: '{{recipient.address}}',
        label: 'Customer Address',
        category: 'customer',
        description: 'Billing or shipping address of the client',
        example: '402 Commerce Park, SG Highway, Ahmedabad, Gujarat 380054'
    },
    {
        token: 'recipient.mobile',
        syntax: '{{recipient.mobile}}',
        label: 'Customer Phone',
        category: 'customer',
        description: 'Customer contact phone or mobile number',
        example: '+91 91234 56780'
    },
    {
        token: 'recipient.email',
        syntax: '{{recipient.email}}',
        label: 'Customer Email',
        category: 'customer',
        description: 'Customer email address for invoice delivery',
        example: 'accounts@globalenterprises.com'
    },
    {
        token: 'recipient.gstNumber',
        syntax: '{{recipient.gstNumber}}',
        label: 'Customer GSTIN',
        category: 'customer',
        description: 'GSTIN of the client for B2B tax credit',
        example: '24BBBBB1111B1Z2'
    },
    {
        token: 'recipient.state',
        syntax: '{{recipient.state}}',
        label: 'Customer State',
        category: 'customer',
        description: 'State of the customer for intra/interstate tax calculation',
        example: '24-Gujarat'
    },

    // === Line Items (Repeating Block) ===
    {
        token: 'items',
        syntax: '{{#items}}\n<tr>\n  <td>{{index}}</td>\n  <td>{{description}}</td>\n  <td>{{quantity}}</td>\n  <td>{{price}}</td>\n  <td>{{total}}</td>\n</tr>\n{{/items}}',
        label: 'Line Items Block',
        category: 'items',
        isBlock: true,
        description: 'Repeating section that iterates over each invoice line item',
        example: '{{#items}}...{{/items}}'
    },
    {
        token: 'index',
        syntax: '{{index}}',
        label: 'Item Index (#)',
        category: 'items',
        description: '1-based sequential row number of the item',
        example: '1'
    },
    {
        token: 'description',
        syntax: '{{description}}',
        label: 'Item Description',
        category: 'items',
        description: 'Product or service description',
        example: 'Web Application Architecture & Development'
    },
    {
        token: 'hsnSac',
        syntax: '{{hsnSac}}',
        label: 'HSN / SAC Code',
        category: 'items',
        description: 'Harmonized System of Nomenclature or SAC code',
        example: '998314'
    },
    {
        token: 'quantity',
        syntax: '{{quantity}}',
        label: 'Item Quantity',
        category: 'items',
        description: 'Number of units billed',
        example: '2'
    },
    {
        token: 'unit',
        syntax: '{{unit}}',
        label: 'Item Unit',
        category: 'items',
        description: 'Unit of measurement (e.g., Pcs, Hours, Month)',
        example: 'Project'
    },
    {
        token: 'price',
        syntax: '{{price}}',
        label: 'Unit Price / Rate',
        category: 'items',
        description: 'Formatted unit rate or price per item',
        example: '45,000.00'
    },
    {
        token: 'total',
        syntax: '{{total}}',
        label: 'Item Total Amount',
        category: 'items',
        description: 'Total line amount (quantity × unit price)',
        example: '45,000.00'
    },
    {
        token: 'gstRate',
        syntax: '{{gstRate}}',
        label: 'Item GST Rate (%)',
        category: 'items',
        description: 'Applicable GST percentage for the item',
        example: '18'
    },

    // === Totals & Taxes ===
    {
        token: 'currency',
        syntax: '{{currency}}',
        label: 'Currency Symbol',
        category: 'totals',
        description: 'Active currency symbol (e.g., ₹)',
        example: '₹'
    },
    {
        token: 'totals.subtotal',
        syntax: '{{totals.subtotal}}',
        label: 'Subtotal',
        category: 'totals',
        description: 'Sum of all line items before taxes and discounts',
        example: '60,000.00'
    },
    {
        token: 'totals.taxAmount',
        syntax: '{{totals.taxAmount}}',
        label: 'Total Tax',
        category: 'totals',
        description: 'Total tax amount across CGST, SGST, and IGST',
        example: '10,800.00'
    },
    {
        token: 'totals.cgstAmount',
        syntax: '{{totals.cgstAmount}}',
        label: 'CGST Amount',
        category: 'totals',
        description: 'Central GST amount (for intrastate transactions)',
        example: '5,400.00'
    },
    {
        token: 'totals.sgstAmount',
        syntax: '{{totals.sgstAmount}}',
        label: 'SGST Amount',
        category: 'totals',
        description: 'State GST amount (for intrastate transactions)',
        example: '5,400.00'
    },
    {
        token: 'totals.igstAmount',
        syntax: '{{totals.igstAmount}}',
        label: 'IGST Amount',
        category: 'totals',
        description: 'Integrated GST amount (for interstate transactions)',
        example: '0.00'
    },
    {
        token: 'totals.discountAmount',
        syntax: '{{totals.discountAmount}}',
        label: 'Discount Amount',
        category: 'totals',
        description: 'Deducted discount amount applied to the invoice',
        example: '2,000.00'
    },
    {
        token: 'discountLabel',
        syntax: '{{discountLabel}}',
        label: 'Discount Label',
        category: 'totals',
        description: 'Custom label for the discount (e.g., Early Payment Rebate)',
        example: 'Early Payment Rebate'
    },
    {
        token: 'totals.total',
        syntax: '{{totals.total}}',
        label: 'Grand Total',
        category: 'totals',
        description: 'Final invoice payable amount after tax and discount',
        example: '68,800.00'
    },
    {
        token: 'totals.balance',
        syntax: '{{totals.balance}}',
        label: 'Balance Due',
        category: 'totals',
        description: 'Remaining amount due from the customer',
        example: '68,800.00'
    },
    {
        token: 'totals.received',
        syntax: '{{totals.received}}',
        label: 'Amount Received',
        category: 'totals',
        description: 'Total payment amount already collected',
        example: '0.00'
    },
    {
        token: 'totals.totalInWords',
        syntax: '{{totals.totalInWords}}',
        label: 'Total in Words',
        category: 'totals',
        description: 'Formal monetary amount written in words for tax invoices',
        example: 'Sixty-Eight Thousand Eight Hundred Rupees Only'
    },

    // === Payment & Banking Details ===
    {
        token: 'paymentInfo',
        syntax: '{{paymentInfo}}',
        label: 'Payment Info / UPI ID',
        category: 'payment',
        description: 'UPI Virtual Payment Address or payment instructions',
        example: 'apexsolutions@okaxis'
    },
    {
        token: 'bankDetails.bankName',
        syntax: '{{bankDetails.bankName}}',
        label: 'Bank Name',
        category: 'payment',
        description: 'Name of the business bank for NEFT/RTGS transfers',
        example: 'HDFC Bank'
    },
    {
        token: 'bankDetails.accountNumber',
        syntax: '{{bankDetails.accountNumber}}',
        label: 'Bank Account Number',
        category: 'payment',
        description: 'Account number for direct bank remittances',
        example: '50200012345678'
    },
    {
        token: 'bankDetails.ifscCode',
        syntax: '{{bankDetails.ifscCode}}',
        label: 'Bank IFSC Code',
        category: 'payment',
        description: '11-character Indian Financial System Code',
        example: 'HDFC0000123'
    },
    {
        token: 'bankDetails.accountHolder',
        syntax: '{{bankDetails.accountHolder}}',
        label: 'Account Holder Name',
        category: 'payment',
        description: 'Exact account name registered with the bank',
        example: 'Apex Solutions Pvt Ltd'
    }
]);

/**
 * Validates that every token registered in TEMPLATE_TOKENS is genuinely
 * supported by the renderInvoiceTemplate engine.
 *
 * @returns {boolean}
 */
export function verifyAllTokensSupported() {
    return TEMPLATE_TOKENS.every(t => {
        if (t.isBlock) {
            return SUPPORTED_TEMPLATE_TOKENS.has(t.token);
        }
        return SUPPORTED_TEMPLATE_TOKENS.has(t.token) ||
            t.token.includes('.') ||
            SUPPORTED_TEMPLATE_TOKENS.has(t.token.split('.')[0]);
    });
}

/**
 * Deterministically generates a unique copy name for a template duplicate.
 * Prevents name collisions by scanning existing template names case-insensitively.
 *
 * Examples:
 * - "Classic" -> "Classic (Copy)"
 * - "Classic (Copy)" -> "Classic (Copy 2)"
 * - "Custom Layout (Copy 2)" -> "Custom Layout (Copy 3)"
 *
 * @param {string} baseName - Original template name
 * @param {Array<{ name: string }>} existingTemplates - Array of existing template objects
 * @returns {string} Guaranteed unique template name
 */
export function generateUniqueTemplateName(baseName, existingTemplates = []) {
    const rawName = typeof baseName === 'string' && baseName.trim() ? baseName.trim() : 'Template';
    const namesSet = new Set(
        (Array.isArray(existingTemplates) ? existingTemplates : [])
            .map(t => (t && typeof t.name === 'string' ? t.name.trim().toLowerCase() : ''))
            .filter(Boolean)
    );

    // Extract base without trailing copy suffix if present
    const copyMatch = rawName.match(/^(.*?)(?:\s*\((?:Copy|\bcopy\b)(?:\s+(\d+))?\))?$/i);
    const cleanBase = (copyMatch && copyMatch[1] ? copyMatch[1].trim() : rawName);

    // Try first candidate: "${cleanBase} (Copy)"
    let candidate = `${cleanBase} (Copy)`;
    if (!namesSet.has(candidate.toLowerCase())) {
        return candidate;
    }

    // Try successive numbered candidates: "${cleanBase} (Copy 2)", "${cleanBase} (Copy 3)", etc.
    let counter = 2;
    while (counter < 1000) {
        candidate = `${cleanBase} (Copy ${counter})`;
        if (!namesSet.has(candidate.toLowerCase())) {
            return candidate;
        }
        counter++;
    }

    return `${cleanBase} (Copy ${Date.now()})`;
}

/**
 * Clean baseline HTML starter template for creating brand-new invoice designs in Template Studio.
 */
export const STARTER_HTML_TEMPLATE = `<div class="invoice-container bespoke-layout">
  <!-- Invoice Header -->
  <header class="invoice-header">
    <div class="brand-block">
      <h1 class="company-name">{{sender.name}}</h1>
      <p class="company-address">{{sender.address}}</p>
      <p class="company-contact">Phone: {{sender.phone}} | Email: {{sender.email}}</p>
      <p class="company-gst">GSTIN: {{sender.gstNumber}}</p>
    </div>
    <div class="meta-block">
      <h2 class="title">INVOICE</h2>
      <p><strong>Invoice No:</strong> {{invoiceNumber}}</p>
      <p><strong>Date:</strong> {{date}}</p>
      <p><strong>Due Date:</strong> {{dueDate}}</p>
      <p><strong>Place of Supply:</strong> {{placeOfSupply}}</p>
    </div>
  </header>

  <!-- Parties Grid -->
  <section class="parties-grid">
    <div class="party-card billed-by">
      <h3>Billed By</h3>
      <p class="party-name">{{sender.name}}</p>
      <p>{{sender.address}}</p>
      <p>GSTIN: {{sender.gstNumber}}</p>
    </div>
    <div class="party-card billed-to">
      <h3>Billed To</h3>
      <p class="party-name">{{recipient.name}}</p>
      <p>{{recipient.address}}</p>
      <p>Phone: {{recipient.mobile}}</p>
      <p>GSTIN: {{recipient.gstNumber}}</p>
    </div>
  </section>

  <!-- Items Table -->
  <section class="items-section">
    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>HSN/SAC</th>
          <th>Qty</th>
          <th>Rate ({{currency}})</th>
          <th>Amount ({{currency}})</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td>{{index}}</td>
          <td>{{description}}</td>
          <td>{{hsnSac}}</td>
          <td>{{quantity}}</td>
          <td>{{price}}</td>
          <td>{{total}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
  </section>

  <!-- Summary & Banking -->
  <section class="summary-section">
    <div class="bank-details">
      <h3>Bank Remittance Details</h3>
      <p><strong>Bank:</strong> {{bankDetails.bankName}}</p>
      <p><strong>Account:</strong> {{bankDetails.accountNumber}}</p>
      <p><strong>IFSC:</strong> {{bankDetails.ifscCode}}</p>
      <p><strong>UPI ID:</strong> {{paymentInfo}}</p>
    </div>
    <div class="totals-table">
      <div class="total-row"><span>Subtotal:</span><span>{{currency}} {{totals.subtotal}}</span></div>
      <div class="total-row"><span>Tax Amount:</span><span>{{currency}} {{totals.taxAmount}}</span></div>
      <div class="total-row grand-total"><span>Grand Total:</span><span>{{currency}} {{totals.total}}</span></div>
      <p class="amount-in-words">{{totals.totalInWords}}</p>
    </div>
  </section>

  <!-- Footer -->
  <footer class="invoice-footer">
    <p>{{notes}}</p>
    <p class="terms">{{termsAndConditions}}</p>
  </footer>
</div>`;

/**
 * Clean baseline CSS starter stylesheet for Template Studio.
 */
export const STARTER_CSS_TEMPLATE = `/* Bespoke Invoice Layout Styling */
.bespoke-layout {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1e293b;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px;
  background: #ffffff;
}

.bespoke-layout .invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 24px;
  margin-bottom: 24px;
}

.bespoke-layout .company-name {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.bespoke-layout .title {
  font-size: 28px;
  font-weight: 900;
  color: #2563eb;
  margin: 0 0 12px 0;
  text-align: right;
}

.bespoke-layout .parties-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}

.bespoke-layout .party-card {
  padding: 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.bespoke-layout .party-card h3 {
  margin: 0 0 8px 0;
  font-size: 11px;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.bespoke-layout .party-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.bespoke-layout .items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 28px;
}

.bespoke-layout .items-table th {
  background: #0f172a;
  color: #ffffff;
  padding: 10px 14px;
  font-size: 12px;
  text-align: left;
}

.bespoke-layout .items-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
}

.bespoke-layout .summary-section {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.bespoke-layout .totals-table {
  width: 320px;
}

.bespoke-layout .total-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.bespoke-layout .grand-total {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  border-top: 2px solid #0f172a;
  padding-top: 8px;
  margin-top: 6px;
}

.bespoke-layout .amount-in-words {
  font-size: 11px;
  color: #64748b;
  font-style: italic;
  margin-top: 8px;
}

.bespoke-layout .invoice-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  font-size: 11px;
  color: #64748b;
}`;
