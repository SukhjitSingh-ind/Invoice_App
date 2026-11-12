# Invoice Manager

A modern, fast, and offline-capable invoicing and client management suite built with **React 19**, **Vite**, and **Tailwind CSS**. Designed specifically for small businesses, freelancers, and enterprises needing full GST/Non-GST compliance, multi-company profiles, UPI QR payments, financial reporting, and professional PDF generation.

---

## Table of Contents

1. [Overview & Key Features](#overview--key-features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Directory Layout](#project-directory-layout)
5. [Getting Started & Installation](#getting-started--installation)
6. [Environment Configuration](#environment-configuration)
7. [Available Scripts & Workflow](#available-scripts--workflow)
8. [Testing & Quality Verification](#testing--quality-verification)
9. [Performance & Bundling Strategy](#performance--bundling-strategy)
10. [Build & Deployment](#build--deployment)
11. [Contributing & Standards](#contributing--standards)

---

## Overview & Key Features

- **GST & Tax Compliance**: Full support for Indian GST calculation, separating Intra-state (CGST + SGST) and Interstate (IGST) taxes, with custom tax rates per line item and percentage or fixed discount support.
- **Number to Words Conversion**: Automatic translation of invoice grand totals into words following the Indian currency convention (Rupees, Lakhs, Crores, and Paise).
- **UPI QR Code Payments**: Instant generation of dynamic UPI payment QR codes encoding UPI VPA, payee name, invoice amount, and note for seamless smartphone payment scanning.
- **8 Professional Invoice Templates**: Variety of layouts (Clean Serif, Minimalist Mono, Creative Bold, Corporate Green, Modern Indigo, Retro Warm, Dark Future, Luxury Gold) with custom branding, color themes, and background uploads.
- **Client & Item Management**: Centralized client phonebook and item catalogue with item-level pricing history, auto-fill during invoice creation, and individual JSON backups.
- **Reports & Analytics**: Visual revenue analytics, top-selling items by revenue/quantity, and client spending breakdown with one-click multi-sheet Excel (`.xlsx`) export.
- **Data Privacy & Backup**: 100% client-side persistence using structured `localStorage`, complete with full database JSON snapshot export and restore.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) |
| **Routing** | React Router DOM v7 |
| **Build Tool & Bundler** | Vite 7 (ESM, Rollup) |
| **Styling & Design System** | Tailwind CSS v3, PostCSS, Autoprefixer |
| **Iconography** | Lucide React |
| **Data Visualizations** | Recharts v3 |
| **Document & Data Export** | `html2pdf.js`, `xlsx`, `qrcode.react` |
| **Linting & Code Quality** | ESLint 9 (Flat Config), `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| **Testing** | Node.js automated test runner (`src/run_tests.js`) |

---

## Architecture Overview

The application follows a clean, decoupled layer architecture:

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
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               Utilities & Domain Helpers               │
│   invoiceCalculations, numberToWords, validation,      │
│   templates configuration & theme mapping              │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Storage / Persistence                │
│             Browser LocalStorage (JSON-backed)          │
└────────────────────────────────────────────────────────┘
```

For an in-depth exploration of architecture decisions, state management, and lifecycle patterns, consult [ARCHITECTURE.md](file:///c:/Users/HP/OneDrive/Desktop/Invoice%20generator/invoice-app/ARCHITECTURE.md).

---

## Project Directory Layout

```
invoice-app/
├── public/                 # Static assets and favicons
├── src/
│   ├── assets/             # Brand logos and static images
│   ├── components/         # Reusable UI components
│   │   ├── InvoiceEditor/  # Editor sub-components (Header, Table, Footer)
│   │   ├── PaymentQRCode.jsx # Dynamic UPI QR code component
│   │   ├── Sidebar.jsx     # Navigation sidebar with responsive toggle
│   │   └── Toast.jsx       # Global notification toast provider and hook
│   ├── layouts/
│   │   └── MainLayout.jsx  # Main application shell with sidebar outlet
│   ├── Pages/              # Route views (Lazy-loaded)
│   │   ├── Clients.jsx     # Client address book & management
│   │   ├── CreateInvoice.jsx # Invoice initiation wizard
│   │   ├── Dashboard.jsx   # Metrics, receivables, and recent activity
│   │   ├── Help.jsx        # Documentation & usage guidance
│   │   ├── InvoiceEditor.jsx # Full-featured invoice form & editor
│   │   ├── InvoicePreview.jsx # High-fidelity print & PDF view
│   │   ├── Invoices.jsx    # Invoice table, filter, and quick payment toggle
│   │   ├── Items.jsx       # Inventory catalogue & price history
│   │   ├── LandingPage.jsx # Product introduction & quick start
│   │   ├── Reports.jsx     # Sales analytics, charts & Excel export
│   │   ├── Settings.jsx    # Application validation & backup settings
│   │   └── YourDetails.jsx # Company profiles & banking configuration
│   ├── services/           # Data access layer & business services
│   │   ├── backupService.js  # Full database export and restore
│   │   ├── clientService.js  # Client CRUD, upsert, and JSON sync
│   │   ├── invoiceService.js # Invoice creation, numbering, and queries
│   │   ├── itemService.js    # Items catalogue, prices, and histories
│   │   ├── reportService.js  # Metric aggregations and sales calculations
│   │   └── settingsService.js# Profile & display preferences persistence
│   ├── utils/              # Pure computational helpers & tests
│   │   ├── invoiceCalculations.js      # Subtotal, tax, discount formulas
│   │   ├── invoiceCalculations.test.js # Calculation unit tests
│   │   ├── numberToWords.js            # Indian numbering conversion
│   │   ├── numberToWords.test.js       # Number-to-words unit tests
│   │   ├── templates.js                # Template styling configurations
│   │   ├── templates.test.js           # Template registry unit tests
│   │   ├── validation.js               # GST, phone, and email validators
│   │   └── validation.test.js          # Validation unit tests
│   ├── App.jsx             # Route definitions & lazy code-splitting
│   ├── index.css           # Tailwind base styles and font imports
│   ├── main.jsx            # Application entry point
│   └── run_tests.js        # Automated test suite runner
├── .env.example            # Environment variables template
├── ARCHITECTURE.md         # Detailed architectural documentation
├── eslint.config.js        # ESLint 9 flat configuration
├── package.json            # Project manifest, scripts, and dependencies
├── tailwind.config.js      # Tailwind CSS configuration
└── vite.config.js          # Vite build, server, and manual chunks setup
```

---

## Getting Started & Installation

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: `npm` (v9+) or `yarn` / `pnpm`

### Installation

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

## Environment Configuration

Environment variables are managed using Vite's `import.meta.env` system.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_APP_TITLE` | Application title rendered in the browser | `Invoice Generator` |
| `VITE_API_BASE_URL` | Optional remote API endpoint (for future sync) | `http://localhost:3000/api` |

---

## Available Scripts & Workflow

All scripts are executed via `npm run <script>`:

- `npm run dev`: Starts the Vite local development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles and minifies the application into the `dist/` directory with code splitting and vendor chunking.
- `npm run lint`: Executes ESLint 9 to verify React rules, hook invariants, and variable usage.
- `npm test`: Runs the automated unit test suite across calculation, validation, number-to-words, and template modules.
- `npm run preview`: Launches a local static server to test production build artifacts from `dist/`.

---

## Testing & Quality Verification

Unit tests execute without external heavyweight harnesses via Node's ESM runtime:

```bash
npm test
```

Test coverage includes:
- **`invoiceCalculations.test.js`**: Verifies intra-state GST (CGST/SGST), interstate IGST, percentage vs. fixed discounts, payment balances, and edge cases (empty or null invoices).
- **`numberToWords.test.js`**: Validates boundary values (Zero, Units, Tens, Hundreds, Thousands, and decimal Paise fractions).
- **`validation.test.js`**: Validates statutory GSTIN formats (15 alphanumeric characters), RFC email patterns, and mobile phone lengths.
- **`templates.test.js`**: Validates template registry uniqueness, layout integrity, and fallback resolution.

---

## Performance & Bundling Strategy

To ensure sub-second First Contentful Paint (FCP) and optimal caching:

1. **Route-Level Code Splitting**: All pages are dynamically imported via `React.lazy` and wrapped in `Suspense` inside `src/App.jsx`.
2. **Deterministic Vendor Chunks**: `vite.config.js` organizes dependencies into modular chunks:
   - `react-vendor`: React runtime, DOM, and Router (~45 kB).
   - `charts-vendor`: Recharts data visualization library (~361 kB, loaded only on analytics views).
   - `excel-vendor`: XLSX spreadsheet library (~282 kB, loaded only on export).
   - `pdf-vendor`: html2pdf and rendering engine (~975 kB, isolated from main initial payload).
3. **Optimized Initial Bundle**: Initial entry payload is reduced to ~195 kB (~62 kB gzipped), preventing heavy export dependencies from blocking initial dashboard interactions.

---

## Build & Deployment

### Building for Production

```bash
npm run build
```
The optimized production bundle will be generated in `dist/`.

### Deployment Options

- **Vercel / Netlify / Cloudflare Pages**: Connect the Git repository and set:
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **SPA Rewrites**: Route all traffic to `index.html` (e.g. via `public/_redirects` or `vercel.json` if required).
- **Static Nginx Server**:
  ```nginx
  server {
      listen 80;
      server_name your-domain.com;
      root /var/www/invoice-app/dist;
      index index.html;

      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```

---

## Contributing & Standards

1. Follow the **Code Commenting Policy**: Never write trivial comments that restate self-evident code. Document *why*, not *what*.
2. Ensure `npm run lint` and `npm test` pass before committing.
3. Keep business logic and formulas inside `src/utils` or `src/services` rather than hardcoding them inside React JSX components.
