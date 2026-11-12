import React from 'react';

export default function InvoiceFooter({ invoice, setInvoice, amountInWords }) {
    return (
        <>
            {/* Amount in Words - GST only */}
            {invoice.isGST && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Invoice Amount in Words</h4>
                    <p className="font-medium text-slate-800 italic">{amountInWords}</p>
                </div>
            )}

            {/* Terms and Conditions - GST only */}
            {invoice.isGST && (
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Terms and Conditions</h4>
                    <textarea
                        value={invoice.termsAndConditions || ''}
                        onChange={(e) => setInvoice(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                        placeholder="Enter terms and conditions..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                        rows={3}
                    />
                </div>
            )}

            {/* Bank Details - GST only */}
            {invoice.isGST && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Payment Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Bank Name</label>
                            <input
                                value={invoice.bankDetails?.bankName || ''}
                                onChange={(e) => setInvoice(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: e.target.value } }))}
                                placeholder="Enter bank name"
                                className="w-full p-2 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Account Number</label>
                            <input
                                value={invoice.bankDetails?.accountNumber || ''}
                                onChange={(e) => setInvoice(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: e.target.value } }))}
                                placeholder="Enter account number"
                                className="w-full p-2 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">IFSC Code</label>
                            <input
                                value={invoice.bankDetails?.ifscCode || ''}
                                onChange={(e) => setInvoice(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, ifscCode: e.target.value } }))}
                                placeholder="Enter IFSC code"
                                className="w-full p-2 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Account Holder</label>
                            <input
                                value={invoice.bankDetails?.accountHolder || ''}
                                onChange={(e) => setInvoice(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountHolder: e.target.value } }))}
                                placeholder="Enter account holder name"
                                className="w-full p-2 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="grid grid-cols-2 gap-12 mt-12 border-t-2 border-slate-100 pt-8">
                <div>
                    <label className="text-slate-500 font-bold text-sm block mb-2 uppercase">Notes</label>
                    <textarea
                        value={invoice.notes}
                        onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none h-24 resize-none"
                    />
                </div>
                <div className="flex flex-col items-end justify-end">

                </div>
            </div>
        </>
    );
}
