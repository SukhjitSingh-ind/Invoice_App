import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { ToastProvider } from './components/Toast';

const LandingPage = lazy(() => import('./Pages/LandingPage'));
const Dashboard = lazy(() => import('./Pages/Dashboard'));
const Invoices = lazy(() => import('./Pages/Invoices'));
const Clients = lazy(() => import('./Pages/Clients'));
const Items = lazy(() => import('./Pages/Items'));
const Reports = lazy(() => import('./Pages/Reports'));
const Help = lazy(() => import('./Pages/Help'));
const CreateInvoice = lazy(() => import('./Pages/CreateInvoice'));
const InvoiceEditor = lazy(() => import('./Pages/InvoiceEditor'));
const Settings = lazy(() => import('./Pages/Settings'));
const YourDetails = lazy(() => import('./Pages/YourDetails'));
const InvoicePreview = lazy(() => import('./Pages/InvoicePreview'));

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
            <Route path="/" element={<LandingPage />} />

            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/items" element={<Items />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/help" element={<Help />} />
              <Route path="/create" element={<CreateInvoice />} />
              <Route path="/editor/new" element={<InvoiceEditor />} />
              <Route path="/edit/:id" element={<InvoiceEditor />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/your-details" element={<YourDetails />} />
            </Route>

            <Route path="/preview/:id" element={<InvoicePreview />} />
          </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
  );
}
