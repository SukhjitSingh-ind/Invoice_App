# Architecture Decision & Engineering Design Record

## 1. Architectural Philosophy & Principles

Invoice Manager is structured around foundational software engineering principles designed to guarantee maintainability over a 5-year lifecycle:

- **Single Responsibility Principle (SRP)**: UI components render state; business services interface with storage; mathematical and statutory domain rules reside in pure, testable utility functions.
- **Separation of Concerns (SoC)**: Presentation logic is completely decoupled from calculation and persistence logic. For example, tax calculations and Grand Total equations live entirely in `src/utils/invoiceCalculations.js` rather than being redundantly computed inside editor or preview components.
- **Client-First Offline Architecture**: The application operates autonomously without mandatory backend services. Data is persisted in browser storage with comprehensive JSON serialization for backups, transfers, and disaster recovery.
- **Performance by Construction**: Zero-cost initial loads via route code-splitting, targeted Rollup vendor chunking, and lazy React state initializers that avoid cascading re-renders.

---

## 2. Component & Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Application Shell                    │
│   (index.html -> main.jsx -> App.jsx -> MainLayout)    │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Full-Screen Views     │ │     Dashboard Views       │
│  LandingPage, Preview     │ │ Invoices, Clients, Items, │
│                           │ │ Reports, Details, Settings│
└─────────────┬─────────────┘ └───────────┬───────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Shared UI Elements                   │
│   ToastProvider/useToast, Sidebar, PaymentQRCode,       │
│   InvoiceEditor (Header, ItemsTable, Footer)            │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Service Layer                       │
│   invoiceService, clientService, itemService,           │
│   settingsService, reportService, backupService         │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Domain & Utility Layer                  │
│   invoiceCalculations (Taxes, discounts, balances)      │
│   numberToWords (Indian numbering formatting)           │
│   validation (GSTIN, Phone, Email regex)                │
│   templates (Themes, layout presets, font palettes)     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Key Architectural Decisions (ADRs)

### ADR-1: Pure Utility Layer for Domain Calculations
- **Context**: Invoicing requires precise subtotal, GST (CGST/SGST/IGST), discount, and balance computations across multiple views (Editor, Preview, Invoices list, Reports).
- **Decision**: Centralize all calculation formulas in pure functions in `src/utils/invoiceCalculations.js`.
- **Consequences**:
  - Eliminates logic duplication across components.
  - Ensures 100% unit-testability without needing DOM or React component mounting.
  - Guarantees consistency across PDF exports and live editor views.

### ADR-2: Lazy Initial State Pattern over Synchronous Mount Effects
- **Context**: Previously, components mounted with `useState(null)` or `useState([])` and immediately triggered `useEffect(() => { loadData(); }, [])`, invoking synchronous `localStorage` reads that caused cascading re-renders, layout shift ("Loading..." flash), and React compiler warnings.
- **Decision**: Adopt lazy initial state function constructors:
  ```javascript
  const [invoices, setInvoices] = useState(() => getAllInvoices());
  ```
- **Consequences**:
  - The initial render directly displays hydrated data.
  - Zero cascading re-renders.
  - Eliminates `react-hooks/set-state-in-effect` violations.

### ADR-3: Granular Bundle Splitting & Vendor Chunking
- **Context**: Third-party libraries (`html2pdf.js`, `xlsx`, `recharts`) inflated the main bundle past 2.07 MB, slowing down initial page loads even for simple route visits.
- **Decision**: Implement dynamic imports (`React.lazy`) for all route components, combined with targeted `manualChunks` in `vite.config.js`:
  - `react-vendor`: Core React dependencies.
  - `charts-vendor`: Recharts.
  - `excel-vendor`: XLSX parser and writer.
  - `pdf-vendor`: html2pdf and rendering engine.
- **Consequences**:
  - Initial payload reduced to ~195 kB (~62 kB gzipped).
  - Heavy export libraries only load when requested or when navigating to their respective routes.

### ADR-4: Indian Currency Number-to-Words Engine
- **Context**: Statutory GST and formal invoices in India require the Grand Total to be explicitly written in words with Rupees and Paise.
- **Decision**: Maintain a dedicated recursive converter (`src/utils/numberToWords.js`) respecting Indian grouping standards:
  - Units, Teens, Tens, Hundreds, Thousands, Lakhs, Crores, and Paise.
- **Consequences**:
  - Accurate legal compliance without external bloated dependencies.
  - Verified by deterministic unit tests covering boundary values.

---

## 4. Data Flow & State Management

```
User Action (e.g. Save Invoice)
        │
        ▼
Component Event Handler
        │
        ▼
Service Method (e.g. saveInvoice in invoiceService.js)
        │
        ├── Validate & Generate ID (Timestamp)
        │
        ├── Serialize & Write to localStorage
        │
        ▼
Toast Notification / State Update
        │
        ▼
Re-render with memoized aggregations (useMemo)
```

1. **Local State**: Kept in component state for transient input fields (modal forms, search filters).
2. **Global Notifications**: Managed via React Context (`ToastProvider` & `useToast`).
3. **Persistent State**: Read on-demand through Services with fallback initialization to defaults.

---

## 5. Security & Privacy Considerations

- **Client-Side Isolation**: All customer, company, and financial data is stored locally within the user's browser storage. No financial records are transmitted to third-party tracking servers.
- **Input Sanitization**: Numeric parsing uses defensive coercion (`toNumber`), falling back to 0 when receiving `NaN` or malformed inputs.
- **Image File Size Constraints**: Embedded images (logos and background uploads) enforce a strict 500 KB ceiling to prevent LocalStorage quota exhaustion.

---

## 6. Future Extensibility & Scalability

- **Multi-Tenant Remote Sync**: The service layer (`src/services/`) can be adapted to call REST or GraphQL APIs with zero changes required to presentation components.
- **Custom Fonts**: Additional regional typography can be incorporated by registering CSS font rules in `index.css` and mapping font classes in `src/utils/templates.js`.
- **E-Way Bill & E-Invoice Integration**: The domain model is aligned with Indian NIC E-Invoice JSON schema requirements, making automated API submission a natural next step.

