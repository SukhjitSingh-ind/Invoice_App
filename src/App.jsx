import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { ToastProvider } from './components/Toast';
import { ROUTES } from './constants/index.js';

const LandingPage = lazy(() => import('./Pages/LandingPage'));
const Dashboard = lazy(() => import('./Pages/Dashboard'));
const Invoices = lazy(() => import('./Pages/Invoices'));
const Clients = lazy(() => import('./Pages/Clients'));
const Items = lazy(() => import('./Pages/Items'));
const Reports = lazy(() => import('./Pages/Reports'));
const Help = lazy(() => import('./Pages/Help'));
const CreateInvoice = lazy(() => import('./Pages/CreateInvoice'));
const CreateInvoiceFromJson = lazy(() => import('./Pages/CreateInvoiceFromJson'));
const InvoiceEditor = lazy(() => import('./Pages/InvoiceEditor'));
const Settings = lazy(() => import('./Pages/Settings'));
const YourDetails = lazy(() => import('./Pages/YourDetails'));
const InvoicePreview = lazy(() => import('./Pages/InvoicePreview'));
const TemplateStudio = lazy(() => import('./Pages/TemplateStudio'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path={ROUTES.HOME} element={<LandingPage />} />

            <Route element={<MainLayout />}>
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
              <Route path={ROUTES.INVOICES} element={<Invoices />} />
              <Route path={ROUTES.CLIENTS} element={<Clients />} />
              <Route path={ROUTES.ITEMS} element={<Items />} />
              <Route path={ROUTES.REPORTS} element={<Reports />} />
              <Route path={ROUTES.HELP} element={<Help />} />
              <Route path={ROUTES.CREATE_INVOICE} element={<CreateInvoice />} />
              <Route path={ROUTES.CREATE_INVOICE_JSON} element={<CreateInvoiceFromJson />} />
              <Route path={ROUTES.CREATE_FROM_JSON} element={<CreateInvoiceFromJson />} />
              <Route path={ROUTES.EDITOR_NEW} element={<InvoiceEditor />} />
              <Route path={ROUTES.EDIT_INVOICE} element={<InvoiceEditor />} />
              <Route path={ROUTES.SETTINGS} element={<Settings />} />
              <Route path={ROUTES.YOUR_DETAILS} element={<YourDetails />} />
            </Route>

            <Route path={ROUTES.PREVIEW_INVOICE} element={<InvoicePreview />} />
            <Route path={ROUTES.TEMPLATE_STUDIO} element={<TemplateStudio />} />
          </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
  );
}
