/**
 * Built-in Invoice Template Definitions
 * Contains complete HTML structure, CSS styling, and dynamic tokens for built-in invoice layouts:
 * 1. Classic (Traditional, formal serif, bordered tables, corporate presentation)
 * 2. Modern (Contemporary, sleek sans-serif typography, indigo accents, clean visual hierarchy)
 * 3. Minimal (Stark, clean monochromatic presentation, efficient whitespace, print-friendly)
 */

import {
    BUILT_IN_TEMPLATE_NAMES,
    BUILT_IN_TEMPLATE_KEYS
} from '../constants/index.js';

/* =========================================================================
   1. CLASSIC TEMPLATE
   ========================================================================= */

const CLASSIC_HTML = `<div class="invoice-container classic-layout">
  <!-- Invoice Header -->
  <header class="classic-header">
    <div class="company-brand">
      <h1 class="company-name">{{sender.name}}</h1>
      <p class="company-address">{{sender.address}}</p>
      <div class="company-contact">
        <span class="contact-item"><strong>Phone:</strong> {{sender.phone}}</span>
        <span class="contact-divider">|</span>
        <span class="contact-item"><strong>Email:</strong> {{sender.email}}</span>
      </div>
      <p class="company-gst"><strong>GSTIN:</strong> {{sender.gstNumber}}</p>
    </div>
    <div class="invoice-title-block">
      <h2 class="document-title">TAX INVOICE</h2>
      <table class="meta-table">
        <tbody>
          <tr>
            <td class="meta-label">Invoice No:</td>
            <td class="meta-value">{{invoice.number}}</td>
          </tr>
          <tr>
            <td class="meta-label">Date:</td>
            <td class="meta-value">{{invoice.date}}</td>
          </tr>
          <tr>
            <td class="meta-label">Due Date:</td>
            <td class="meta-value">{{invoice.dueDate}}</td>
          </tr>
          <tr>
            <td class="meta-label">Place of Supply:</td>
            <td class="meta-value">{{placeOfSupply}}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </header>

  <!-- Parties Section -->
  <section class="classic-parties-grid">
    <div class="party-box billed-by">
      <h3 class="box-heading">Billed By</h3>
      <p class="party-name">{{sender.name}}</p>
      <p class="party-address">{{sender.address}}</p>
      <p class="party-meta"><strong>GSTIN:</strong> {{sender.gstNumber}}</p>
      <p class="party-meta"><strong>State:</strong> {{sender.state}}</p>
    </div>
    <div class="party-box billed-to">
      <h3 class="box-heading">Billed To</h3>
      <p class="party-name">{{recipient.name}}</p>
      <p class="party-address">{{recipient.address}}</p>
      <p class="party-meta"><strong>Phone:</strong> {{recipient.mobile}}</p>
      <p class="party-meta"><strong>Email:</strong> {{recipient.email}}</p>
      <p class="party-meta"><strong>GSTIN:</strong> {{recipient.gstNumber}}</p>
    </div>
  </section>

  <!-- Items Table -->
  <section class="classic-table-section">
    <table class="classic-items-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-desc">Item Description</th>
          <th class="col-hsn">HSN/SAC</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit">Unit</th>
          <th class="col-rate">Rate ({{currency}})</th>
          <th class="col-total">Amount ({{currency}})</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td class="col-num">{{index}}</td>
          <td class="col-desc">{{description}}</td>
          <td class="col-hsn">{{hsnSac}}</td>
          <td class="col-qty">{{quantity}}</td>
          <td class="col-unit">{{unit}}</td>
          <td class="col-rate">{{price}}</td>
          <td class="col-total">{{total}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
  </section>

  <!-- Summary & Totals -->
  <section class="classic-summary-section">
    <div class="classic-payment-details">
      <h4 class="section-subheading">Bank & Payment Details</h4>
      <p><strong>Bank:</strong> {{bankDetails.bankName}}</p>
      <p><strong>Account No:</strong> {{bankDetails.accountNumber}}</p>
      <p><strong>IFSC Code:</strong> {{bankDetails.ifscCode}}</p>
      <p><strong>Account Holder:</strong> {{bankDetails.accountHolder}}</p>
      <p><strong>UPI ID:</strong> {{paymentInfo}}</p>
    </div>
    <div class="classic-totals-box">
      <table class="classic-totals-table">
        <tbody>
          <tr>
            <td class="totals-label">Subtotal:</td>
            <td class="totals-val">{{currency}} {{totals.subtotal}}</td>
          </tr>
          <tr>
            <td class="totals-label">{{discountLabel}}:</td>
            <td class="totals-val">- {{currency}} {{totals.discountAmount}}</td>
          </tr>
          <tr>
            <td class="totals-label">CGST:</td>
            <td class="totals-val">{{currency}} {{totals.cgstAmount}}</td>
          </tr>
          <tr>
            <td class="totals-label">SGST:</td>
            <td class="totals-val">{{currency}} {{totals.sgstAmount}}</td>
          </tr>
          <tr>
            <td class="totals-label">IGST:</td>
            <td class="totals-val">{{currency}} {{totals.igstAmount}}</td>
          </tr>
          <tr class="grand-total-row">
            <td class="totals-label">Total Amount:</td>
            <td class="totals-val">{{currency}} {{totals.total}}</td>
          </tr>
          <tr>
            <td class="totals-label">Amount Paid:</td>
            <td class="totals-val">{{currency}} {{totals.received}}</td>
          </tr>
          <tr class="balance-due-row">
            <td class="totals-label">Balance Due:</td>
            <td class="totals-val">{{currency}} {{totals.balance}}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Total in Words -->
  <section class="classic-words-section">
    <p><strong>Amount in Words:</strong> {{totals.totalInWords}}</p>
  </section>

  <!-- Notes & Signatures -->
  <footer class="classic-footer">
    <div class="classic-notes">
      <p><strong>Notes:</strong> {{notes}}</p>
      <p class="terms-text"><strong>Terms & Conditions:</strong> {{termsAndConditions}}</p>
    </div>
    <div class="classic-signature-box">
      <p class="signature-line">For {{sender.name}}</p>
      <div class="signature-space"></div>
      <p class="signature-label">Authorized Signatory</p>
    </div>
  </footer>
</div>`;

const CLASSIC_CSS = `/* Classic Template Styles */
.classic-layout {
  font-family: 'Georgia', 'Times New Roman', serif;
  color: #1a202c;
  background-color: #ffffff;
  padding: 32px;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.5;
  box-sizing: border-box;
}

.classic-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #2b6cb0;
  padding-bottom: 20px;
  margin-bottom: 24px;
}

.company-name {
  font-size: 24px;
  font-weight: bold;
  color: #1a365d;
  margin: 0 0 4px 0;
}

.company-address, .company-contact, .company-gst {
  font-size: 13px;
  color: #4a5568;
  margin: 2px 0;
}

.contact-divider {
  margin: 0 6px;
  color: #a0aec0;
}

.document-title {
  font-size: 22px;
  font-weight: bold;
  color: #2b6cb0;
  text-align: right;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.meta-table {
  font-size: 13px;
  border-collapse: collapse;
}

.meta-label {
  font-weight: bold;
  padding: 2px 8px 2px 0;
  color: #4a5568;
  text-align: right;
}

.meta-value {
  padding: 2px 0;
  color: #1a202c;
}

.classic-parties-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.party-box {
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  padding: 14px;
  background-color: #f7fafc;
}

.box-heading {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #2b6cb0;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
  margin: 0 0 8px 0;
}

.party-name {
  font-size: 15px;
  font-weight: bold;
  margin: 0 0 4px 0;
  color: #2d3748;
}

.party-address, .party-meta {
  font-size: 13px;
  margin: 2px 0;
  color: #4a5568;
}

.classic-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 13px;
}

.classic-items-table th {
  background-color: #ebf8ff;
  color: #2b6cb0;
  border: 1px solid #bee3f8;
  padding: 8px 10px;
  text-align: left;
  font-weight: bold;
}

.classic-items-table td {
  border: 1px solid #e2e8f0;
  padding: 8px 10px;
}

.classic-items-table .col-num { width: 35px; text-align: center; }
.classic-items-table .col-desc { width: 40%; }
.classic-items-table .col-hsn { width: 80px; text-align: center; }
.classic-items-table .col-qty { width: 45px; text-align: right; }
.classic-items-table .col-unit { width: 50px; text-align: center; }
.classic-items-table .col-rate { width: 85px; text-align: right; }
.classic-items-table .col-total { width: 95px; text-align: right; font-weight: bold; }

.classic-summary-section {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.classic-payment-details {
  flex: 1;
  font-size: 12px;
  background-color: #f7fafc;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.section-subheading {
  font-size: 13px;
  font-weight: bold;
  color: #2b6cb0;
  margin: 0 0 6px 0;
  text-transform: uppercase;
}

.classic-payment-details p {
  margin: 2px 0;
}

.classic-totals-box {
  width: 280px;
}

.classic-totals-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.classic-totals-table td {
  padding: 4px 6px;
}

.totals-label {
  text-align: right;
  color: #4a5568;
}

.totals-val {
  text-align: right;
  font-weight: 500;
}

.grand-total-row {
  border-top: 2px solid #2b6cb0;
  border-bottom: 2px solid #2b6cb0;
  font-weight: bold;
  font-size: 15px;
  color: #1a365d;
}

.balance-due-row {
  font-weight: bold;
  color: #c53030;
}

.classic-words-section {
  font-size: 13px;
  background-color: #ebf8ff;
  border-left: 4px solid #3182ce;
  padding: 8px 12px;
  margin-bottom: 20px;
}

.classic-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #cbd5e0;
  padding-top: 16px;
  font-size: 12px;
}

.classic-notes {
  max-width: 60%;
  color: #4a5568;
}

.classic-signature-box {
  text-align: center;
  width: 200px;
}

.signature-space {
  height: 50px;
  border-bottom: 1px solid #a0aec0;
  margin-bottom: 6px;
}

@media print {
  .classic-layout {
    padding: 0;
    max-width: 100%;
  }
}`;

/* =========================================================================
   2. MODERN TEMPLATE
   ========================================================================= */

const MODERN_HTML = `<div class="invoice-container modern-layout">
  <!-- Top Accent Bar -->
  <div class="modern-top-bar"></div>

  <!-- Header Section -->
  <header class="modern-header">
    <div class="modern-brand">
      <h1 class="modern-company-name">{{sender.name}}</h1>
      <p class="modern-tagline">Professional Invoicing</p>
      <div class="modern-brand-info">
        <span>{{sender.address}}</span>
        <span>Phone: {{sender.phone}} | Email: {{sender.email}}</span>
        <span>GSTIN: {{sender.gstNumber}}</span>
      </div>
    </div>
    <div class="modern-meta-card">
      <div class="invoice-badge">INVOICE</div>
      <div class="modern-meta-row">
        <span class="modern-meta-title">Invoice #</span>
        <span class="modern-meta-value">{{invoice.number}}</span>
      </div>
      <div class="modern-meta-row">
        <span class="modern-meta-title">Issue Date</span>
        <span class="modern-meta-value">{{invoice.date}}</span>
      </div>
      <div class="modern-meta-row">
        <span class="modern-meta-title">Due Date</span>
        <span class="modern-meta-value">{{invoice.dueDate}}</span>
      </div>
    </div>
  </header>

  <!-- Parties Grid -->
  <section class="modern-parties">
    <div class="modern-party-card">
      <span class="modern-card-tag">ISSUED BY</span>
      <h3 class="party-title">{{sender.name}}</h3>
      <p>{{sender.address}}</p>
      <p class="party-detail"><strong>State:</strong> {{sender.state}}</p>
      <p class="party-detail"><strong>GST:</strong> {{sender.gstNumber}}</p>
    </div>
    <div class="modern-party-card highlight-card">
      <span class="modern-card-tag">INVOICE TO</span>
      <h3 class="party-title">{{recipient.name}}</h3>
      <p>{{recipient.address}}</p>
      <p class="party-detail"><strong>Phone:</strong> {{recipient.mobile}}</p>
      <p class="party-detail"><strong>Email:</strong> {{recipient.email}}</p>
      <p class="party-detail"><strong>GSTIN:</strong> {{recipient.gstNumber}}</p>
    </div>
  </section>

  <!-- Items Table -->
  <section class="modern-table-container">
    <table class="modern-table">
      <thead>
        <tr>
          <th class="col-idx">#</th>
          <th class="col-name">Item & Description</th>
          <th class="col-code">HSN/SAC</th>
          <th class="col-amount">Qty</th>
          <th class="col-price">Unit Price ({{currency}})</th>
          <th class="col-line-total">Total ({{currency}})</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td class="col-idx">{{index}}</td>
          <td class="col-name">
            <span class="item-desc">{{description}}</span>
          </td>
          <td class="col-code">{{hsnSac}}</td>
          <td class="col-amount">{{quantity}} {{unit}}</td>
          <td class="col-price">{{price}}</td>
          <td class="col-line-total">{{total}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
  </section>

  <!-- Financial Summary -->
  <section class="modern-summary">
    <div class="modern-banking-card">
      <h4>Payment & Banking</h4>
      <div class="banking-grid">
        <div><strong>Bank:</strong> {{bankDetails.bankName}}</div>
        <div><strong>Account:</strong> {{bankDetails.accountNumber}}</div>
        <div><strong>IFSC:</strong> {{bankDetails.ifscCode}}</div>
        <div><strong>Holder:</strong> {{bankDetails.accountHolder}}</div>
        <div><strong>UPI ID:</strong> {{paymentInfo}}</div>
      </div>
    </div>
    <div class="modern-totals-card">
      <div class="total-line">
        <span>Subtotal</span>
        <span>{{currency}} {{totals.subtotal}}</span>
      </div>
      <div class="total-line discount">
        <span>{{discountLabel}}</span>
        <span>- {{currency}} {{totals.discountAmount}}</span>
      </div>
      <div class="total-line tax">
        <span>CGST</span>
        <span>{{currency}} {{totals.cgstAmount}}</span>
      </div>
      <div class="total-line tax">
        <span>SGST</span>
        <span>{{currency}} {{totals.sgstAmount}}</span>
      </div>
      <div class="total-line tax">
        <span>IGST</span>
        <span>{{currency}} {{totals.igstAmount}}</span>
      </div>
      <div class="total-line grand-total">
        <span>Grand Total</span>
        <span class="total-figure">{{currency}} {{totals.total}}</span>
      </div>
      <div class="total-line balance-due">
        <span>Balance Due</span>
        <span>{{currency}} {{totals.balance}}</span>
      </div>
    </div>
  </section>

  <!-- Words representation -->
  <div class="modern-words-card">
    <span class="words-label">In Words:</span> {{totals.totalInWords}}
  </div>

  <!-- Footer -->
  <footer class="modern-footer">
    <div class="modern-notes">
      <p class="notes-title">Notes & Instructions</p>
      <p>{{notes}}</p>
      <p class="terms-copy">{{termsAndConditions}}</p>
    </div>
    <div class="modern-sign-wrapper">
      <p class="sign-for">For {{sender.name}}</p>
      <div class="sign-blank"></div>
      <p class="sign-subtext">Authorized Signature</p>
    </div>
  </footer>
</div>`;

const MODERN_CSS = `/* Modern Template Styles */
.modern-layout {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  background-color: #ffffff;
  padding: 36px;
  max-width: 820px;
  margin: 0 auto;
  line-height: 1.6;
  position: relative;
  box-sizing: border-box;
}

.modern-top-bar {
  height: 6px;
  background: linear-gradient(90deg, #4f46e5, #06b6d4);
  border-radius: 4px 4px 0 0;
  margin: -36px -36px 30px -36px;
}

.modern-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.modern-company-name {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin: 0;
}

.modern-tagline {
  font-size: 13px;
  color: #64748b;
  margin: 2px 0 10px 0;
}

.modern-brand-info {
  display: flex;
  flex-direction: column;
  font-size: 12.5px;
  color: #475569;
}

.modern-meta-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
  min-width: 220px;
}

.invoice-badge {
  display: inline-block;
  background-color: #4f46e5;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.modern-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin: 4px 0;
}

.modern-meta-title {
  color: #64748b;
}

.modern-meta-value {
  font-weight: 600;
  color: #0f172a;
}

.modern-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}

.modern-party-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
}

.modern-party-card.highlight-card {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.modern-card-tag {
  font-size: 10.5px;
  font-weight: 700;
  color: #6366f1;
  letter-spacing: 1px;
}

.party-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 6px 0 6px 0;
}

.modern-party-card p {
  font-size: 13px;
  color: #475569;
  margin: 2px 0;
}

.party-detail {
  font-size: 12.5px;
}

.modern-table-container {
  margin-bottom: 24px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.modern-table thead {
  background-color: #f1f5f9;
}

.modern-table th {
  color: #334155;
  font-weight: 600;
  padding: 12px 14px;
  text-align: left;
}

.modern-table td {
  padding: 12px 14px;
  border-top: 1px solid #f1f5f9;
  color: #334155;
}

.modern-table .col-idx { width: 30px; color: #94a3b8; }
.modern-table .col-name { width: 45%; font-weight: 500; }
.modern-table .col-code { width: 75px; text-align: center; }
.modern-table .col-amount { width: 65px; text-align: right; }
.modern-table .col-price { width: 90px; text-align: right; }
.modern-table .col-line-total { width: 100px; text-align: right; font-weight: 700; color: #0f172a; }

.modern-summary {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.modern-banking-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  font-size: 12.5px;
}

.modern-banking-card h4 {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.banking-grid div {
  margin: 4px 0;
  color: #475569;
}

.modern-totals-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  color: #64748b;
}

.total-line.discount {
  color: #10b981;
}

.total-line.grand-total {
  border-top: 2px solid #e2e8f0;
  padding-top: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.total-figure {
  color: #4f46e5;
  font-weight: 800;
}

.total-line.balance-due {
  color: #ef4444;
  font-weight: 600;
}

.modern-words-card {
  background-color: #f1f5f9;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: #334155;
  margin-bottom: 24px;
}

.words-label {
  font-weight: 700;
  color: #475569;
}

.modern-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #f1f5f9;
  padding-top: 20px;
}

.modern-notes {
  max-width: 60%;
  font-size: 12px;
  color: #64748b;
}

.notes-title {
  font-weight: 600;
  color: #334155;
  margin-bottom: 4px;
}

.terms-copy {
  margin-top: 6px;
  font-size: 11px;
}

.modern-sign-wrapper {
  text-align: center;
  width: 180px;
}

.sign-for {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 40px;
}

.sign-blank {
  border-bottom: 1.5px dashed #cbd5e1;
  margin-bottom: 6px;
}

.sign-subtext {
  font-size: 11px;
  color: #94a3b8;
}

@media print {
  .modern-layout {
    padding: 0;
    max-width: 100%;
  }
}`;

/* =========================================================================
   3. MINIMAL TEMPLATE
   ========================================================================= */

const MINIMAL_HTML = `<div class="invoice-container minimal-layout">
  <!-- Minimal Header -->
  <header class="minimal-header">
    <div class="minimal-left">
      <h1 class="minimal-company-name">{{sender.name}}</h1>
      <p class="minimal-subline">{{sender.address}}</p>
      <p class="minimal-subline">{{sender.phone}} &bull; {{sender.email}}</p>
      <p class="minimal-subline">GSTIN: {{sender.gstNumber}}</p>
    </div>
    <div class="minimal-right">
      <div class="minimal-title">INVOICE</div>
      <div class="minimal-meta">
        <div class="meta-row"><span class="k">Invoice:</span> <span class="v">{{invoice.number}}</span></div>
        <div class="meta-row"><span class="k">Date:</span> <span class="v">{{invoice.date}}</span></div>
        <div class="meta-row"><span class="k">Due:</span> <span class="v">{{invoice.dueDate}}</span></div>
      </div>
    </div>
  </header>

  <div class="minimal-hairline"></div>

  <!-- Recipient / Billed To -->
  <section class="minimal-billed">
    <div class="billed-label">BILLED TO</div>
    <div class="billed-name">{{recipient.name}}</div>
    <div class="billed-address">{{recipient.address}}</div>
    <div class="billed-contact">{{recipient.mobile}} &bull; {{recipient.email}}</div>
    <div class="billed-gst">GSTIN: {{recipient.gstNumber}}</div>
  </section>

  <!-- Items Table -->
  <section class="minimal-table-wrap">
    <table class="minimal-table">
      <thead>
        <tr>
          <th class="th-desc">Description</th>
          <th class="th-hsn">HSN</th>
          <th class="th-qty">Qty</th>
          <th class="th-rate">Price ({{currency}})</th>
          <th class="th-amt">Total ({{currency}})</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td class="td-desc">{{description}}</td>
          <td class="td-hsn">{{hsnSac}}</td>
          <td class="td-qty">{{quantity}} {{unit}}</td>
          <td class="td-rate">{{price}}</td>
          <td class="td-amt">{{total}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
  </section>

  <!-- Totals Section -->
  <section class="minimal-summary">
    <div class="minimal-payment-info">
      <div class="pay-label">Payment Instructions</div>
      <div>Bank: {{bankDetails.bankName}}</div>
      <div>Account: {{bankDetails.accountNumber}}</div>
      <div>IFSC: {{bankDetails.ifscCode}}</div>
      <div>UPI: {{paymentInfo}}</div>
    </div>
    <div class="minimal-totals">
      <div class="min-total-row"><span>Subtotal</span><span>{{currency}} {{totals.subtotal}}</span></div>
      <div class="min-total-row"><span>{{discountLabel}}</span><span>- {{currency}} {{totals.discountAmount}}</span></div>
      <div class="min-total-row"><span>CGST</span><span>{{currency}} {{totals.cgstAmount}}</span></div>
      <div class="min-total-row"><span>SGST</span><span>{{currency}} {{totals.sgstAmount}}</span></div>
      <div class="min-total-row"><span>IGST</span><span>{{currency}} {{totals.igstAmount}}</span></div>
      <div class="min-total-row final-total"><span>Total</span><span>{{currency}} {{totals.total}}</span></div>
      <div class="min-total-row balance"><span>Balance Due</span><span>{{currency}} {{totals.balance}}</span></div>
    </div>
  </section>

  <div class="minimal-words">
    <strong>In Words:</strong> {{totals.totalInWords}}
  </div>

  <!-- Footer Notes -->
  <footer class="minimal-footer">
    <div class="min-notes">
      <p>{{notes}}</p>
      <p class="min-terms">{{termsAndConditions}}</p>
    </div>
    <div class="min-sign">
      <div class="min-sign-space"></div>
      <div class="min-sign-text">Authorized Signatory</div>
    </div>
  </footer>
</div>`;

const MINIMAL_CSS = `/* Minimal Template Styles */
.minimal-layout {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #111827;
  background-color: #ffffff;
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.5;
  box-sizing: border-box;
}

.minimal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.minimal-company-name {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 4px 0;
}

.minimal-subline {
  font-size: 12px;
  color: #6b7280;
  margin: 2px 0;
}

.minimal-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  text-align: right;
  margin-bottom: 8px;
}

.minimal-meta {
  font-size: 12px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0;
}

.meta-row .k {
  color: #6b7280;
}

.meta-row .v {
  font-weight: 600;
}

.minimal-hairline {
  height: 1px;
  background-color: #e5e7eb;
  margin-bottom: 24px;
}

.minimal-billed {
  margin-bottom: 24px;
  font-size: 12.5px;
}

.billed-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.billed-name {
  font-weight: 700;
  font-size: 14px;
}

.billed-address, .billed-contact, .billed-gst {
  color: #4b5563;
  margin: 2px 0;
}

.minimal-table-wrap {
  margin-bottom: 24px;
}

.minimal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.minimal-table th {
  border-top: 1px solid #111827;
  border-bottom: 1px solid #111827;
  padding: 8px 4px;
  text-align: left;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.minimal-table td {
  border-bottom: 1px solid #f3f4f6;
  padding: 10px 4px;
  color: #1f2937;
}

.minimal-table .th-desc, .minimal-table .td-desc { width: 50%; }
.minimal-table .th-hsn, .minimal-table .td-hsn { width: 70px; text-align: center; }
.minimal-table .th-qty, .minimal-table .td-qty { width: 60px; text-align: right; }
.minimal-table .th-rate, .minimal-table .td-rate { width: 85px; text-align: right; }
.minimal-table .th-amt, .minimal-table .td-amt { width: 95px; text-align: right; font-weight: 600; }

.minimal-summary {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.minimal-payment-info {
  font-size: 11.5px;
  color: #6b7280;
  line-height: 1.6;
}

.pay-label {
  font-weight: 600;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.minimal-totals {
  width: 250px;
  font-size: 12.5px;
}

.min-total-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  color: #4b5563;
}

.min-total-row.final-total {
  border-top: 1px solid #111827;
  border-bottom: 1px solid #111827;
  margin-top: 6px;
  padding: 6px 0;
  font-weight: 700;
  font-size: 14px;
  color: #111827;
}

.min-total-row.balance {
  font-weight: 600;
  color: #dc2626;
  padding-top: 4px;
}

.minimal-words {
  font-size: 12px;
  color: #4b5563;
  margin-bottom: 24px;
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
}

.minimal-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  font-size: 11px;
  color: #6b7280;
}

.min-notes {
  max-width: 60%;
}

.min-terms {
  margin-top: 4px;
}

.min-sign {
  text-align: center;
  width: 160px;
}

.min-sign-space {
  border-bottom: 1px solid #111827;
  height: 40px;
  margin-bottom: 4px;
}

@media print {
  .minimal-layout {
    padding: 0;
    max-width: 100%;
  }
}`;

/* =========================================================================
   EXPORTED BUILT-IN TEMPLATES
   ========================================================================= */

export const CLASSIC_TEMPLATE = Object.freeze({
    name: BUILT_IN_TEMPLATE_NAMES.CLASSIC,
    key: BUILT_IN_TEMPLATE_KEYS.CLASSIC,
    isDefault: true,
    isBuiltIn: true,
    html: CLASSIC_HTML,
    css: CLASSIC_CSS,
});

export const MODERN_TEMPLATE = Object.freeze({
    name: BUILT_IN_TEMPLATE_NAMES.MODERN,
    key: BUILT_IN_TEMPLATE_KEYS.MODERN,
    isDefault: false,
    isBuiltIn: true,
    html: MODERN_HTML,
    css: MODERN_CSS,
});

export const MINIMAL_TEMPLATE = Object.freeze({
    name: BUILT_IN_TEMPLATE_NAMES.MINIMAL,
    key: BUILT_IN_TEMPLATE_KEYS.MINIMAL,
    isDefault: false,
    isBuiltIn: true,
    html: MINIMAL_HTML,
    css: MINIMAL_CSS,
});

export const BUILT_IN_TEMPLATES = Object.freeze([
    CLASSIC_TEMPLATE,
    MODERN_TEMPLATE,
    MINIMAL_TEMPLATE
]);
