import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './Pages/Dashboard';
import InvoiceEditor from './Pages/InvoiceEditor';
import InvoicePreview from './Pages/InvoicePreview';
import LandingPage from './Pages/LandingPage';
import CreateInvoice from './Pages/CreateInvoice';
import Invoices from './Pages/Invoices';
import Settings from './Pages/Settings';
import Clients from './Pages/Clients';
import Items from './Pages/Items';
import Reports from './Pages/Reports';
import Help from './Pages/Help';
import YourDetails from './Pages/YourDetails';

import { ToastProvider } from './components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <Router>
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
          {/* Preview is full screen / outside layout usually, but could be inside too. Keeping outside for clean print view */}
          <Route path="/preview/:id" element={<InvoicePreview />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}