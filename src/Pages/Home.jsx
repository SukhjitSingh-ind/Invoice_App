import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Printer, FileText, Trash2, Layout } from 'lucide-react';
import { getAllInvoices, deleteInvoice, createEmptyInvoice, saveInvoice } from '../services/invoiceService';
import { TEMPLATES } from '../utils/templates';

export default function Home() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    const data = getAllInvoices();
    console.log('Loaded invoices:', data);
    setInvoices(data);
    setLoading(false);
  };

  const handleCreate = (templateId = 'default') => {
    const newInvoice = createEmptyInvoice();
    newInvoice.template = templateId;
    const saved = saveInvoice(newInvoice);
    navigate(`/edit/${saved.id}`);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      console.log('Deleting invoice:', deleteConfirm);
      deleteInvoice(deleteConfirm);
      const updatedInvoices = getAllInvoices();
      setInvoices(updatedInvoices);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-slate-900">
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Delete Invoice?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this invoice? All data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800">Invoice Manager</h1>
              <p className="text-slate-500 font-medium text-xs">GK Auto Electric Works</p>
            </div>
            <button
              onClick={() => handleCreate('default')}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
            >
              <Plus size={18} /> New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Templates Section */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Layout size={20} className="text-slate-500" /> Start with a Template
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => handleCreate(template.id)}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group text-left border border-slate-200"
              >
                <div className={`h-24 ${template.previewColor} w-full relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-white opacity-10 rotate-12 scale-150 transform translate-y-8"></div>
                  <div className="absolute bottom-2 right-2 bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Plus className="text-white" size={20} />
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-slate-800">{template.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>


        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-slate-500" /> Recent Invoices
        </h3>

        {invoices.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Invoices Yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first invoice to verify your templates and start managing your billing.</p>
            <button onClick={() => handleCreate()} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all">
              Create First Invoice
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => navigate(`/edit/${inv.id}`)}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Invoice {inv.number}</h4>
                    <p className="text-xs text-slate-500 font-medium">{inv.recipient.name || 'Untitled Client'}</p>
                  </div>
                  <div className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">
                    {inv.date}
                  </div>
                </div>

                <div className="border-t border-slate-100 my-3 pt-3 flex justify-between items-end">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase block">Total Amount</span>
                    <span className="text-xl font-black text-slate-900">
                      {(inv.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigate(`/preview/${inv.id}`);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Print / Preview"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(inv.id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}