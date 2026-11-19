# Invoice Manager

A modern, fast, and offline-capable invoicing, inventory, and client management suite built with **React 19**, **Vite**, and **Tailwind CSS**, powered by a high-performance **Dexie.js (IndexedDB)** persistence engine. 

Designed specifically for small businesses, freelancers, and enterprises needing full Indian GST/Non-GST compliance, multi-company profiles, UPI QR payments, financial reporting, and professional PDF generation.

---

## Table of Contents

1. [Overview & Key Features](#overview--key-features)
2. [Technology Stack](#technology-stack)
3. [Architecture & Persistence Model](#architecture--persistence-model)
4. [Project Directory Layout](#project-directory-layout)
5. [Getting Started & Installation](#getting-started--installation)
6. [Available Scripts & Quality Verification](#available-scripts--quality-verification)
7. [Dexie.js (IndexedDB) Persistence & Migration](#dexiejs-indexeddb-persistence--migration)
8. [JSON Invoice Import & Data Model](#json-invoice-import--data-model)
9. [Performance & Bundling Strategy](#performance--bundling-strategy)
10. [Build & Deployment](#build--deployment)
11. [Developer Guidelines & Standards](#developer-guidelines--standards)

---

## Overview & Key Features

- **IndexedDB Persistence with Dexie.js**: Robust, structured client-side database capable of storing thousands of invoices, clients, and items without the 5 MB quota limitations or main-thread blocking of `localStorage`.
- **Statutory GST & Tax Compliance**: Full support for Indian GST calculation, separating Intra-state (CGST + SGST) and Interstate (IGST) taxes, with item-level tax rates, percentage or fixed discounts, and strict boolean tax flags (`IsGST` and `IsIGST`).
- **Create Invoice from JSON**: High-speed JSON invoice import parser with live syntax validation, warning diagnostics, client and template override precedence, and automatic editor hydration.
- **Dynamic UPI QR Code Payments**: Instant generation of dynamic UPI payment QR codes encoding UPI VPA, payee name, invoice amount, and invoice reference for seamless smartphone payment scanning.
- **Number to Words Conversion**: Automatic translation of invoice grand totals into words following Indian currency standards (Rupees, Lakhs, Crores, and Paise).
- **8 Professional Invoice Templates**: Layouts for every business style (Clean Serif, Minimalist Mono, Creative Bold, Corporate Green, Modern Indigo, Retro Warm, Dark Future, Luxury Gold) with custom branding, color themes, and background uploads.
- **Client & Item Management**: Centralized client directory and item catalog with item-level price histories, auto-fill during invoice creation, and standalone JSON backups.
- **Reports & Analytics**: Visual revenue analytics, top-selling items by revenue/quantity, and client spending breakdown with one-click multi-sheet Excel (`.xlsx`) export.
- **Full Database Backup & Disaster Recovery**: One-click JSON backup export and restore across all database tables with automatic data validation and schema normalization.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) |
| **Routing** | React Router DOM v7 |
| **Build Tool & Bundler** | Vite 7 (ESM, Rollup) |
| **Styling & Design System** | Tailwind CSS v3, PostCSS, Autoprefixer |
| **Client-Side Database** | Dexie.js v4 (`dexie`, `dexie-react-hooks`) on **IndexedDB** |
| **Iconography** | Lucide React |
| **Data Visualizations** | Recharts v3 |
| **Document & Data Export** | `html2pdf.js`, `xlsx`, `qrcode.react` |
| **Type Checking** | TypeScript (`tsc --noEmit`) |
| **Linting & Code Quality** | ESLint 9 (Flat Config), `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| **Automated Testing** | Node.js automated test runner (`src/run_tests.js`) |

---

## Architecture & Persistence Model

The application follows a decoupled layered architecture:

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   Pages (Dashboard, InvoiceEditor, Preview, Reports)   │
│   Layouts (MainLayout, Sidebar), Components (Toast)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Business Services                   │
│   invoiceService, clientService, itemService,          │
│   settingsService, reportService, backupService        │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼──────────────┐ ┌───────────▼─────────────┐
│ Utilities & Domain Helpers │ │   In-Memory Cache &     │
│ invoiceCalculations,       │ │   useLiveQuery Hooks    │
│ jsonInvoiceParser,         │ │   (dexie-react-hooks)   │
│ numberToWords, validation  │ └───────────┬─────────────┘
└────────────────────────────┘             │
                            ┌──────────────▼─────────────┐
                            │    Dexie.js / IndexedDB    │
                            │      'InvoiceAppDB'        │
                            └────────────────────────────┘
```

For comprehensive engineering specifications, architectural decisions (ADRs), and lifecycle diagrams, consult [ARCHITECTURE.md](file:///c:/Users/HP/OneDrive/Desktop/Invoice%20generator/invoice-app/ARCHITECTURE.md).

---

## Project Directory Layout

```
invoice-app/
├── public/                 # Static assets and favicons
├── src/
│   ├── assets/             # Brand logos and static images
│   ├── components/         # Reusable UI components
│   │   ├── AppBootstrap.jsx # Database bootstrapper and cache hydration gate
│   │   ├── InvoiceEditor/  # Editor sub-components (Header, Table, Footer)
│   │   ├── PaymentQRCode.jsx # Dynamic UPI QR code component
│   │   ├── Sidebar.jsx     # Navigation sidebar with responsive toggle
│   │   └── Toast.jsx       # Global notification toast provider and hook
│   ├── db/
│   │   └── db.js           # Dexie.js database instance and schema (InvoiceAppDB)
│   ├── layouts/
│   │   └── MainLayout.jsx  # Main application shell with sidebar outlet
│   ├── Pages/              # Route views (Lazy-loaded)
│   │   ├── Clients.jsx     # Client address book & management
│   │   ├── CreateInvoice.jsx # Standard invoice creation wizard
│   │   ├── CreateInvoiceFromJson.jsx # JSON invoice import parser view
│   │   ├── Dashboard.jsx   # Metrics, receivables, and recent activity
│   │   ├── Help.jsx        # User manual and interactive guide
│   │   ├── InvoiceEditor.jsx # Full-featured invoice form & editor
│   │   ├── InvoicePreview.jsx # High-fidelity print & PDF view
│   │   ├── Invoices.jsx    # Invoice table, filter, and quick payment toggle
│   │   ├── Items.jsx       # Inventory catalogue & price history
│   │   ├── LandingPage.jsx # Product introduction & quick start
│   │   ├── Reports.jsx     # Sales analytics, charts & Excel export
│   │   ├── Settings.jsx    # Validation, backup, and restore settings
│   │   └── YourDetails.jsx # Company profiles & banking configuration
│   ├── services/           # Data access layer & business services
│   │   ├── backupService.js   # Full Dexie database export and restore
│   │   ├── clientService.js   # Client CRUD and in-memory cache
│   │   ├── invoiceService.js  # Invoice creation, numbering, and queries
│   │   ├── itemService.js     # Items catalogue and price histories
│   │   ├── migrationService.js # Atomic migration runner & invoice transformer
│   │   ├── migrationService.test.js # Persistence & migration unit tests
│   │   ├── reportService.js   # Metric aggregations and sales calculations
│   │   └── settingsService.js # Profile and application settings persistence
│   ├── types/              # TypeScript definitions & data models
│   │   ├── client.ts       # Client data types
│   │   ├── common.ts       # Shared banking and party interfaces
│   │   ├── invoice.ts      # Authoritative Invoice interface
│   │   ├── item.ts         # Item catalog and price history types
│   │   ├── jsonInvoice.ts  # JSON invoice parsing & resolution types
│   │   ├── report.ts       # Reporting metrics types
│   │   └── settings.ts     # Configuration and profile types
│   ├── utils/              # Pure computational helpers & tests
│   │   ├── clientHelpers.js        # Pagination & search filtering
│   │   ├── cssSanitizer.js         # AST-based CSS sanitization engine (css-tree)
│   │   ├── idGenerator.js          # RFC 4122 v4 UUID generator
│   │   ├── invoiceCalculations.js  # Subtotal, tax, discount formulas
│   │   ├── jsonInvoiceParser.js    # JSON invoice validation and normalization
│   │   ├── numberToWords.js        # Indian currency numbering converter
│   │   ├── templates.js            # Template styling configurations & token engine
│   │   └── validation.ts           # GSTIN, phone, and email validators
│   ├── App.jsx             # Route definitions & lazy code-splitting
│   ├── index.css           # Tailwind base styles and font imports
│   ├── main.jsx            # Application entry point with <AppBootstrap>
│   └── run_tests.js        # Automated test suite runner
├── .env.example            # Environment variables template
├── ARCHITECTURE.md         # Detailed architectural documentation
├── eslint.config.js        # ESLint 9 flat configuration
├── package.json            # Project manifest, scripts, and dependencies
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.js          # Vite build, server, and manual chunks setup
```

---

## Getting Started & Installation

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: `npm` (v9+) or `yarn` / `pnpm`

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/SukhjitSingh-ind/Invoice_App.git
   cd Invoice_App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## Available Scripts & Quality Verification

All scripts are executed via `npm run <script>`:

- `npm run dev`: Starts the Vite local development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles TypeScript and creates an optimized production bundle in `dist/`.
- `npm test`: Runs the automated test suite (244+ unit tests across calculations, JSON parsing, and database migration).
- `npm run typecheck`: Runs the TypeScript compiler (`tsc --noEmit`) to verify type contracts.
- `npm run lint`: Executes ESLint 9 to verify React rules, hook invariants, and code style.
- `npm run preview`: Launches a local static server to preview production build artifacts.

---

## Dexie.js (IndexedDB) Persistence & Migration

### Database Overview
The application persists all structured business data in **IndexedDB** using **Dexie.js** (`InvoiceAppDB`).

- **`invoices`**: Primary invoice records indexed by `id`, `number`, `date`, `IsGST`, `IsIGST`, `template`, `recipient.name`, and `recipient.gstNumber`.
- **`clients`**: Customer directory indexed by `id`, `name`, `mobile`, `email`, `gstNumber`, and `createdAt`.
- **`items`**: Catalog items indexed by `id`, `name`, `hsnSac`, `defaultPrice`, and `createdAt`.
- **`companies`**: Multi-company profiles indexed by `id`, `name`, `gstNumber`, and `isDefault`.
- **`settings`**: Configuration key-value store indexed by `key`, storing validation gates, display preferences, UPI payment defaults, and `selectedTemplateId`.
- **`templates`**: Complete HTML/CSS invoice templates indexed by `++id`, `name`, `isDefault`, `isBuiltIn`, and `updatedAt` (Dexie Version 2).

### Built-in Templates & Seeding
The application ships with three built-in templates automatically seeded into IndexedDB:
- **Classic**: Traditional formal invoice layout with serif typography and bordered tables (`isDefault: true`).
- **Modern**: Contemporary layout with sans-serif typography, gradient accent bar, and metadata cards.
- **Minimal**: High-efficiency, print-optimized monochromatic layout with clean whitespace.

Seeding runs idempotently inside an atomic Dexie transaction during application initialization without overwriting user customizations or existing records.

### Template Token Engine & CSS Sanitization Security Policy
The application provides an enterprise-grade HTML/CSS template rendering pipeline via `renderInvoiceTemplate`:
- **Token Interpolation**: Replaces `{{sender.*}}`, `{{recipient.*}}`, `{{totals.*}}`, and `{{#items}}...{{/items}}` repeating line-item blocks with HTML-escaped data.
- **AST-Based CSS Sanitization**: Powered by `css-tree`, replacing legacy regular expressions with full Abstract Syntax Tree parsing and reconstruction.
- **Security Boundaries**:
  - **At-Rules Allowlist**: Strictly permits `@media`, `@page`, `@supports`, and `@keyframes`; completely strips `@import`, `@font-face`, `@charset`, `@namespace`, and other unapproved at-rules.
  - **Property & Function Defense**: Prohibits `behavior`, `-moz-binding`, and `expression(...)` constructs, including casing variations and CSS escape sequences (`\6a avascript`, `exp\72 ession`).
  - **URL Sanitization (`isSafeUrl`)**: Disallows `javascript:`, `vbscript:`, `file:`, `blob:`, `about:`, `data:text/html`, and `data:image/svg+xml`. Only safe raster image base64 data URIs (`png`, `jpeg`, `gif`, `webp`), valid HTTPS/HTTP URLs, and local relative paths are accepted.
  - **Dual Sanitization Surface**: Integrated into DOMPurify via `uponSanitizeElement` (for `<style>` blocks) and `uponSanitizeAttribute` (for inline `style="..."` attributes).
  - **Centralized Configuration & Hooks**: Defines canonical immutable rules in `DEFAULT_DOMPURIFY_CONFIG` (`WHOLE_DOCUMENT_PURIFY_CONFIG` and `FRAGMENT_PURIFY_CONFIG`), registered idempotently via `registerSanitizationHooks` to prevent duplicate hook accumulation or policy divergence between fragments and full documents.
  - **Fail-Safe Fallback**: Malformed, truncated, or unparseable CSS syntax automatically fails closed to prevent bypasses. Empty rules and empty style blocks are pruned cleanly.

### Automatic Startup Migration
When the application loads, `AppBootstrap` runs `initializeDatabaseAndMigrate()`:
1. **Detection & Locking**: Checks `invoice_app_dexie_migrated`. If unmigrated, sets a lock flag to prevent tab collision.
2. **Safety Backup**: Creates an unmolested snapshot of raw localStorage data in `invoice_app_data_backup_pre_dexie`.
3. **Data Transformation**: Normalizes all legacy invoice records via `transformInvoiceForDexie`, standardizing `IsGST` and `IsIGST` and stripping legacy properties.
4. **Atomic Write**: Inserts all records within an atomic Dexie read-write transaction (`bulkPut`).
5. **Cache Hydration**: Populates synchronous in-memory caches before rendering the UI to avoid blank screen flickers.

*Note: `localStorage` is no longer used for primary business records; its usage is strictly limited to pre-migration backups, migration status markers, and concurrency locks.*

---

## JSON Invoice Import & Data Model

### Authoritative GST Contract
All invoice models in the application strictly use two boolean properties:
- `IsGST: boolean` — Master toggle for tax calculation (Default: `false`).
- `IsIGST: boolean` — Interstate tax flag (meaningful only when `IsGST` is `true`).

Alternative names (`isGST`, `isIGST`, `gst`, `taxEnabled`) have been completely eliminated.

### JSON Import Format (`RawJsonInvoice`)
Invoices can be imported from JSON via the **Create from JSON** feature:

```json
{
  "invoiceNumber": "INV-2026-101",
  "issueDate": "2026-11-17",
  "dueDate": "2026-12-01",
  "template": "modern_indigo",
  "IsGST": true,
  "IsIGST": false,
  "currency": "₹",
  "client": {
    "name": "Acme Logistics",
    "mobile": "9876543210",
    "email": "billing@acmelogistics.com",
    "address": "12 Port Highway, Ahmedabad",
    "gstNumber": "24ABCDE1234F1Z5",
    "state": "24-Gujarat"
  },
  "items": [
    {
      "description": "Freight & Transport Charges",
      "quantity": 1,
      "price": 18500,
      "hsnSac": "9965",
      "unit": "Trip",
      "gstRate": 18
    }
  ],
  "discountType": "fixed",
  "discountValue": 500,
  "discountLabel": "Promotional Discount",
  "notes": "Payment due within 15 days."
}
```

---

## Performance & Bundling Strategy

To ensure optimal initial load times and responsiveness:

1. **Route-Level Code Splitting**: All pages are dynamically loaded with `React.lazy` and wrapped in `Suspense`.
2. **Manual Vendor Chunking**:
   - `react-vendor`: Core React and Router dependencies.
   - `charts-vendor`: Recharts data visualization library (loaded only on analytics views).
   - `excel-vendor`: XLSX spreadsheet generator (loaded only on export).
   - `pdf-vendor`: html2pdf and rendering engine (isolated from main initial bundle).
   - `dexie-react-hooks`: Reactive Dexie integration.
3. **Reactive UI with `useLiveQuery`**: React components subscribe to table updates using `useLiveQuery`, ensuring real-time dashboard updates without manual state polling.

---

## Build & Deployment

### Building for Production
```bash
npm run build
```
Vite compiles and minifies the code into `dist/`.

### Deployment Checklist
- **SPA Rewrites**: Ensure your hosting provider (Vercel, Netlify, Cloudflare Pages, Nginx) routes all unmatched paths to `index.html`.
- **Private Browsing Support**: Dexie.js operates across all modern browsers. In strict private modes that disable IndexedDB, the application gracefully alerts the user via the `AppBootstrap` error boundary.

---

## Developer Guidelines & Standards

1. **Storage Encapsulation**: Never query or mutate Dexie tables directly from React components. Always interface through `src/services/`.
2. **UI Subscriptions**: Use `useLiveQuery` from `dexie-react-hooks` for reactive table queries.
3. **Strict Data Models**: Maintain single agreed property names throughout all code. Use `IsGST` and `IsIGST` exclusively.
4. **Future Schema Upgrades**: Implement database changes via Dexie's declarative versioning (`this.version(2).stores({...}).upgrade(...)`). Do not wipe user tables.
5. **Quality Gates**: Ensure `npm test`, `npm run typecheck`, and `npm run lint` pass before submitting pull requests.
