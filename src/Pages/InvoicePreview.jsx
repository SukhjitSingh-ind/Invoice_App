import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Download, Home, FilePlus } from 'lucide-react';
import { getInvoice } from '../services/invoiceService';
import { getTemplateById } from '../utils/templates';
import { numberToWords } from '../utils/numberToWords';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations';
import { getSettings } from '../services/settingsService';
import PaymentQRCode from '../components/PaymentQRCode';
import html2pdf from 'html2pdf.js';

import logoImg from '../assets/Logo_1_HD.png';
import qrCodeImg from '../assets/QRCODE_1.jpg';

const THEME_STYLES = {
  blue: {
    headerStr: 'text-blue-900',
    accentBg: 'bg-blue-50',
    border: 'border-blue-200',
    tableHeader: 'bg-blue-100',
    borderColor: 'border-blue-600',
    totalText: 'text-blue-900'
  },
  slate: {
    headerStr: 'text-slate-900',
    accentBg: 'bg-slate-50',
    border: 'border-slate-200',
    tableHeader: 'bg-slate-200',
    borderColor: 'border-slate-600',
    totalText: 'text-slate-900'
  },
  purple: {
    headerStr: 'text-purple-900',
    accentBg: 'bg-purple-50',
    border: 'border-purple-200',
    tableHeader: 'bg-purple-100',
    borderColor: 'border-purple-600',
    totalText: 'text-purple-900'
  },
  emerald: {
    headerStr: 'text-emerald-900',
    accentBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    tableHeader: 'bg-emerald-100',
    borderColor: 'border-emerald-600',
    totalText: 'text-emerald-900'
  },
  indigo: {
    headerStr: 'text-indigo-900',
    accentBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    tableHeader: 'bg-indigo-100',
    borderColor: 'border-indigo-600',
    totalText: 'text-indigo-900'
  },
  orange: {
    headerStr: 'text-orange-900',
    accentBg: 'bg-orange-100',
    border: 'border-orange-200',
    tableHeader: 'bg-orange-200',
    borderColor: 'border-orange-600',
    totalText: 'text-orange-900'
  },
  dark: {
    headerStr: 'text-blue-300',
    accentBg: 'bg-slate-800',
    border: 'border-slate-700',
    tableHeader: 'bg-slate-800',
    borderColor: 'border-blue-500',
    totalText: 'text-white'
  },
  gold: {
    headerStr: 'text-amber-400',
    accentBg: 'bg-neutral-800',
    border: 'border-amber-500',
    tableHeader: 'bg-neutral-800',
    borderColor: 'border-amber-500',
    totalText: 'text-amber-400'
  }
};

export default function InvoicePreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const currentSettings = getSettings();
    setSettings(currentSettings);

    if (id) {
      const data = getInvoice(id);
      if (data) {
        setInvoice(data);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  if (!invoice) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const template = getTemplateById(invoice.template || 'default');

  const themeKey = template.id === 'dark_mode' ? 'dark' : (template.color || 'blue');
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.blue;
  const paperClass = template.paperClass || 'bg-white';
  const isModern = template.layout === 'modern';

  // Customization
  const customization = invoice.customization || {};
  const customStyle = {
    backgroundColor: customization.backgroundColor || undefined,
    backgroundImage: customization.backgroundImage ? `url(${customization.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: customization.fontColor || undefined
  };

  const isDark = template.id === 'dark_mode';
  const isGold = template.id === 'luxury_gold';

  // Active company profile for logo
  const activeCompanyProfile =
    settings?.companyProfiles?.find((p) => p.id === settings?.activeProfileId) || null;
  const logoSrc = activeCompanyProfile?.logo || logoImg;

  const {
    subtotal,
    taxAmount,
    igstAmount,
    cgstAmount,
    sgstAmount,
    preDiscountTotal,
    discountAmount,
    total,
    balance,
  } = calculateInvoiceTotals(invoice);

  const discountValue = parseFloat(invoice.discountValue || 0);
  const amountInWords = (invoice.isGST && !isNaN(total)) ? numberToWords(total) : '';

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedItems = () => {
    if (!sortConfig.key) return invoice.items;

    return [...invoice.items].sort((a, b) => {
      let aValue, bValue;
      if (sortConfig.key === 'amount') {
        aValue = (a.quantity || 0) * (a.price || 0);
        bValue = (b.quantity || 0) * (b.price || 0);
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity no-print" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-500 no-print" /> : <ArrowDown size={12} className="text-blue-500 no-print" />;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Get the invoice container element
    const element = document.querySelector('.print-container');
    if (!element) {
      console.error('Invoice container not found');
      return;
    }

    // Get the actual height of the content
    const contentHeight = element.scrollHeight;
    const contentWidth = element.scrollWidth;

    // Calculate aspect ratio and dimensions
    // Standard A4 width is 210mm, we'll use that as base
    const pdfWidth = 210;
    const pdfHeight = Math.max(297, (contentHeight / contentWidth) * pdfWidth);

    // Configure PDF options with custom page height
    const opt = {
      margin: [5, 5, 5, 5], // Small margins: top, right, bottom, left in mm
      filename: `Invoice_${invoice.number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        ignoreElements: (element) => element.classList.contains('no-print')
      },
      jsPDF: {
        unit: 'mm',
        format: [pdfWidth, pdfHeight], // Custom size to fit content
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: 'avoid-all' } // Avoid page breaks
    };

    // Generate and download PDF
    // Generate and download PDF
    html2pdf().set(opt).from(element).save().then(() => {
      setShowSuccessModal(true);
    });
  };

  const totalCols = invoice.isGST ? 6 : 4;

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');
        
        .custom-font-cursive {
            font-family: 'Dancing Script', cursive;
        }

        @media print {
          @page { margin: 0; size: auto; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
          .page-content { padding: 40px !important; }
        }

        
        ${customization.fontColor ? `
          .print-container { color: ${customization.fontColor} !important; }
          .print-container h1, .print-container h2, .print-container h3, .print-container h4, .print-container p, .print-container span, .print-container div, .print-container td { color: ${customization.fontColor} !important; opacity: 1 !important; }
          .print-container .text-white { color: ${customization.fontColor} !important; }
          .print-container .text-slate-900, .print-container .text-slate-800, .print-container .text-slate-700, .print-container .text-slate-600, .print-container .text-slate-500 { color: ${customization.fontColor} !important; }
        ` : ''}
      `}</style>

      <div className="w-full max-w-4xl">
        <div className="no-print mb-6 flex justify-between">
          <button onClick={() => navigate(id ? `/edit/${id}` : '/')} className="flex items-center gap-2 text-slate-600 font-bold hover:text-blue-600">
            <ArrowLeft size={20} /> Back to Editor
          </button>
          <div className="flex gap-3">
            <button onClick={handleDownload} className="bg-emerald-600 text-white px-6 py-2 rounded-lg shadow hover:bg-emerald-700 flex items-center gap-2 font-bold transition-colors">
              <Download size={20} /> Download PDF
            </button>
            <button onClick={handlePrint} className="bg-black text-white px-6 py-2 rounded-lg shadow hover:bg-slate-800 flex items-center gap-2 font-bold transition-colors">
              <Printer size={20} /> Print
            </button>
          </div>
        </div>

        <div
          className={`print-container shadow-xl min-h-[1123px] w-full relative text-slate-900 font-sans ${paperClass}`}
          style={customStyle}
        >

          {isModern && (
            <div className={`w-full p-12 pb-8 ${theme.tableHeader} ${theme.headerStr} flex justify-between items-center`}>
              <div className="flex items-center gap-6">
                <div className={`w-24 h-24 rounded-lg p-2 shadow-sm ${(isDark || isGold) ? 'bg-black' : 'bg-white'}`}>
                  {settings?.display?.showLogo && <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />}
                </div>
                <div>
                  <h1 className={`text-4xl font-serif font-black tracking-tight mb-1 ${theme.headerStr}`}>{invoice.sender.name}</h1>
                  <p className={`text-sm font-medium opacity-80 whitespace-pre-line leading-relaxed max-w-xs ${isGold ? 'text-amber-400/80' : 'text-slate-700'}`}>
                    {invoice.sender.address}
                  </p>
                  {invoice.sender.phone && (
                    <p className={`text-xs font-bold mt-1 ${isGold ? 'text-amber-400/90' : 'text-slate-800'}`}>
                      Mobile: {invoice.sender.phone}
                    </p>
                  )}
                  {invoice.isGST && invoice.sender.gstNumber && (
                    <p className={`text-xs font-bold mt-1 ${isGold ? 'text-amber-400/90' : 'text-slate-800'}`}>
                      GSTIN: {invoice.sender.gstNumber}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-5xl font-black opacity-10 uppercase tracking-widest">{invoice.isGST ? 'Tax Invoice' : 'Invoice'}</h2>
              </div>
            </div>
          )}

          <div className="p-12">

            {!isModern && (
              <div className="flex flex-row justify-between items-center mb-12 gap-8">
                <div className={`w-32 h-32 overflow-hidden rounded-xl ${theme.border} border-2 ${(isDark || isGold) ? 'bg-black' : 'bg-white'}`}>
                  {settings?.display?.showLogo && <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-grow flex flex-col items-center gap-2 text-center pl-8">
                  <h1 className={`text-3xl font-serif font-bold tracking-tight mb-2 ${theme.headerStr}`}>{invoice.sender.name}</h1>
                  <p className={`text-sm font-medium opacity-70 max-w-xs whitespace-pre-line leading-relaxed ${isDark ? 'text-slate-300' : (isGold ? 'text-amber-400' : 'text-slate-600')}`}>
                    {invoice.sender.address}
                  </p>
                  {invoice.sender.phone && (
                    <p className={`text-sm font-bold mt-1 opacity-70 ${isDark ? 'text-blue-400' : (isGold ? 'text-amber-400' : 'text-slate-800')}`}>
                      Mobile: {invoice.sender.phone}
                    </p>
                  )}
                  {invoice.isGST && invoice.sender.gstNumber && (
                    <p className={`text-sm font-bold mt-1 opacity-70 ${isDark ? 'text-blue-400' : (isGold ? 'text-amber-400' : 'text-slate-800')}`}>
                      GSTIN: {invoice.sender.gstNumber}
                    </p>
                  )}

                </div>
              </div>
            )}

            <div className="flex justify-between items-end mb-12">
              <div className={`border-l-4 ${theme.borderColor} pl-6 w-1/2 py-1`}>
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Billed To</h3>
                <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : (isGold ? 'text-amber-400' : 'text-slate-900')}`}>{invoice.recipient.name}</div>

                {invoice.isGST && (
                  <>
                    {invoice.recipient.address && <div className="text-sm opacity-70 mt-1">{invoice.recipient.address}</div>}
                    {invoice.recipient.gstNumber && <div className="text-sm opacity-70">GSTIN: {invoice.recipient.gstNumber}</div>}
                    {invoice.recipient.state && <div className="text-sm opacity-70">State: {invoice.recipient.state}</div>}
                  </>
                )}
                {invoice.recipient.mobile && <div className="text-lg font-medium opacity-80 mt-1">Mobile: {invoice.recipient.mobile}</div>}
              </div>

              <div className="text-right">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-60">Invoice No</div>
                  <div className={`font-black text-2xl ${theme.headerStr}`}>{invoice.number}</div>
                </div>
                <div className="mb-3">
                  <div className="text-xs font-bold uppercase tracking-wider opacity-60">Invoice Date</div>
                  <div className={`font-bold text-xl ${isDark ? 'text-white' : (isGold ? 'text-amber-400' : 'text-slate-900')}`}>
                    {new Date(invoice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {invoice.isGST && invoice.placeOfSupply && (
                  <div className="mt-3">
                    <div className="text-xs font-bold uppercase tracking-wider opacity-60">Place of Supply</div>
                    <div className={`text-lg font-bold ${isDark ? 'text-white' : (isGold ? 'text-amber-400' : 'text-slate-900')}`}>{invoice.placeOfSupply}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-12">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`${customization.backgroundImage ? 'bg-transparent' : theme.tableHeader} border-y-2 ${isGold ? 'border-amber-500' : (isDark ? 'border-slate-700' : 'border-slate-900')}`}>
                    <th
                      className={`py-4 text-left font-bold text-sm uppercase tracking-wider pl-4 cursor-pointer group hover:bg-black/5 transition-colors ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center gap-1">
                        Item Description {getSortIcon('description')}
                      </div>
                    </th>
                    {invoice.isGST && <th className={`py-4 text-center font-bold text-sm uppercase tracking-wider w-24 ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>HSN/SAC</th>}
                    <th
                      className={`py-4 text-center font-bold text-sm uppercase tracking-wider w-24 cursor-pointer group hover:bg-black/5 transition-colors ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Qty {getSortIcon('quantity')}
                      </div>
                    </th>

                    <th
                      className={`py-4 text-center font-bold text-sm uppercase tracking-wider w-32 cursor-pointer group hover:bg-black/5 transition-colors ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Rate {getSortIcon('price')}
                      </div>
                    </th>
                    {invoice.isGST && <th className={`py-4 text-center font-bold text-sm uppercase tracking-wider w-24 ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>GST %</th>}
                    <th
                      className={`py-4 text-center font-bold text-sm uppercase tracking-wider w-40 cursor-pointer group hover:bg-black/5 transition-colors ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Amount {getSortIcon('amount')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isGold ? 'divide-neutral-700' : (isDark ? 'divide-slate-800' : 'divide-slate-200')}`}>
                  {getSortedItems().map((item, index) => (
                    <tr key={item.id} className={index % 2 !== 0 ? theme.accentBg : 'bg-transparent'}>
                      <td className={`py-4 pl-4 text-sm font-semibold ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>{item.description}</td>
                      {invoice.isGST && <td className={`py-4 text-center text-xs ${isGold ? 'text-amber-400/70' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{item.hsnSac || '-'}</td>}
                      <td className={`py-4 text-center text-sm font-medium ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>{item.quantity}</td>
                      <td className={`py-4 text-center text-sm font-medium ${isGold ? 'text-amber-400' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      {invoice.isGST && (
                        <td className={`py-4 text-center text-xs ${isGold ? 'text-amber-400/70' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                          {((item.quantity * item.price) * ((item.gstRate !== undefined ? item.gstRate : 18) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <div className="text-[10px] opacity-60">({item.gstRate !== undefined ? item.gstRate : 18}%)</div>
                        </td>
                      )}
                      <td className={`py-4 text-center text-sm font-bold ${isGold ? 'text-amber-400' : (isDark ? 'text-white' : 'text-slate-900')}`}>{(item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t ${isGold ? 'border-neutral-700' : (isDark ? 'border-slate-800' : 'border-slate-200')}`}>
                    <td colSpan={totalCols} className="py-3">
                      <div className="flex justify-end items-center gap-8 w-full">
                        <span className="font-bold opacity-70">Subtotal</span>
                        <span className={`font-bold w-32 text-center ${theme.totalText}`}>{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </td>
                  </tr>
                  {invoice.isGST && (
                    <>
                      {invoice.isIGST ? (
                        <tr>
                          <td colSpan={totalCols} className="py-2">
                            <div className="flex justify-end items-center gap-8 w-full">
                              <span className="font-bold text-sm">IGST</span>
                              <span className="font-bold text-sm text-center w-32">{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          <tr>
                            <td colSpan={totalCols} className="py-2">
                              <div className="flex justify-end items-center gap-8 w-full">
                                <span className="text-sm">CGST</span>
                                <span className="text-sm text-right w-32">{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={totalCols} className="py-2 pr-4">
                              <div className="flex justify-end items-center gap-8 w-full">
                                <span className="text-sm">SGST</span>
                                <span className="text-sm text-right w-32">{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  )}
                  {discountValue > 0 && (
                    <tr className="border-t border-slate-200">
                      <td colSpan={totalCols} className="py-2">
                        <div className="flex justify-end items-center gap-8 w-full">
                          <span className="text-sm font-bold opacity-70">{invoice.discountLabel || 'Discount'}</span>
                          <span className={`text-sm text-right w-32 ${theme.totalText}`}>
                            {invoice.discountType === 'percentage'
                              ? `${discountValue}% (-${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                              : `-${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            }
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className={`border-t-2 ${isGold ? 'border-amber-500' : (isDark ? 'border-slate-700' : 'border-slate-900')}`}>
                    <td colSpan={totalCols} className="py-6">
                      <div className="flex justify-end items-center gap-8 w-full">
                        <span className="text-xl font-bold opacity-70">Total Amount</span>
                        <span className={`text-2xl font-black text-right w-40 ${theme.totalText}`}>{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </td>
                  </tr>
                  {invoice.isGST && (
                    <>
                      <tr>
                        <td colSpan="5" className="py-2 font-bold text-right text-sm pr-8">Received</td>
                        <td className="py-2 pr-4 text-right text-sm font-bold">{(invoice.received || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td colSpan="5" className="py-2 text-right text-sm pr-8 font-bold">Balance</td>
                        <td className="py-2 pr-4 text-right text-sm font-bold">{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Amount in Words - GST only */}
            {invoice.isGST && amountInWords && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Invoice Amount in Words</h4>
                <p className="font-medium text-slate-800 italic">{amountInWords}</p>
              </div>
            )}

            {/* Terms and Conditions - GST only */}
            {invoice.isGST && invoice.termsAndConditions && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-700 mb-2">Terms and Conditions</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.termsAndConditions}</p>
              </div>
            )}

            {/* Bank Details - GST only */}
            {invoice.isGST && invoice.bankDetails && (invoice.bankDetails.bankName || invoice.bankDetails.accountNumber) && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Payment Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {invoice.bankDetails.bankName && <div><span className="font-bold">Bank Name:</span> {invoice.bankDetails.bankName}</div>}
                  {invoice.bankDetails.accountNumber && <div><span className="font-bold">Account Number:</span> {invoice.bankDetails.accountNumber}</div>}
                  {invoice.bankDetails.ifscCode && <div><span className="font-bold">IFSC Code:</span> {invoice.bankDetails.ifscCode}</div>}
                  {invoice.bankDetails.accountHolder && <div><span className="font-bold">Account Holder:</span> {invoice.bankDetails.accountHolder}</div>}
                </div>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-12 pt-8 border-t-2 ${isGold ? 'border-amber-500' : (isDark ? 'border-slate-800' : 'border-slate-100')}`}>
              <div>
                <span className="font-bold text-xs block mb-3 uppercase tracking-wider opacity-50">Notes & Terms</span>
                <p className={`text-sm font-medium whitespace-pre-line leading-relaxed ${isDark ? 'text-slate-400' : (isGold ? 'text-amber-400' : 'text-slate-600')}`}>{invoice.notes}</p>
              </div>
              <div className="flex flex-col items-end justify-end">
                {settings?.display?.showQrCode && (
                  <div className="flex flex-col items-center">
                    <PaymentQRCode
                      amount={total}
                      note={`Invoice #${invoice.number}`}
                      className="w-28 h-28 object-contain mix-blend-normal"
                      size={112}
                    />
                    <p className={`text-[10px] text-center mt-4 font-medium ${isGold ? 'text-amber-800' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>Scan to Pay</p>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-6 left-0 w-full text-center text-[10px] uppercase tracking-widest opacity-30">
              Computer generated invoice
            </div>
          </div>
        </div>
      </div>

      {/* Download Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download size={32} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Invoice Downloaded!</h3>
              <p className="text-slate-600">Your invoice has been successfully saved. What would you like to do next?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 group"
              >
                <Home size={20} className="group-hover:scale-110 transition-transform" />
                Back to Dashboard
              </button>

              <button
                onClick={() => navigate('/create')}
                className="w-full p-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-3 group"
              >
                <FilePlus size={20} className="group-hover:scale-110 transition-transform" />
                Create New Invoice
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full p-2 text-slate-400 font-semibold hover:text-slate-600 transition-colors text-sm"
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}