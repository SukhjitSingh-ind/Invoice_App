import React from 'react';

export default function InvoiceHeader({ invoice, handleChange, settings, validationErrors, logoSrc }) {
    if (!invoice || !settings) return null;

    return (
        <>
            <div className="flex flex-row justify-between items-center mb-8 gap-8">
                {/* Logo - Top Left */}
                <div className="w-32 h-32 overflow-hidden rounded-xl">
                    {settings?.display?.showLogo && (
                        <img
                            src={logoSrc}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                {/* Sender Info - Top Right */}
                <div className="flex-grow flex flex-col items-center gap-2 text-center">
                    <input
                        value={invoice.sender.name}
                        onChange={(e) => handleChange('sender', 'name', e.target.value)}
                        className="text-3xl font-serif font-bold tracking-tight text-center w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder-slate-300 transition-all"
                        aria-label="Seller Name"
                    />
                    <textarea
                        value={invoice.sender.address}
                        onChange={(e) => handleChange('sender', 'address', e.target.value)}
                        className="text-sm font-medium text-slate-600 text-center w-full max-w-xs bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none resize-none overflow-hidden placeholder-slate-300 transition-all leading-relaxed"
                        rows={4}
                        aria-label="Seller Address"
                    />
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-slate-400" id="sender-mobile-label">Mobile:</span>
                        <input
                            aria-labelledby="sender-mobile-label"
                            value={invoice.sender.phone || ''}
                            onChange={(e) => handleChange('sender', 'phone', e.target.value)}
                            className="text-sm font-medium text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder-slate-300 transition-all"
                            placeholder="Seller Mobile Number"
                        />
                    </div>
                    {invoice.isGST && (
                        <>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-bold text-slate-400">GSTIN:</span>
                                <input
                                    value={invoice.sender.gstNumber || ''}
                                    onChange={(e) => {
                                        handleChange('sender', 'gstNumber', e.target.value);
                                    }}
                                    className={`text-sm font-medium text-slate-600 bg-transparent border-b hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder-slate-300 transition-all ${validationErrors.sellerGstNumber ? 'border-red-500' : 'border-transparent'
                                        }`}
                                    placeholder="Seller GST Number"
                                />
                            </div>
                            {validationErrors.sellerGstNumber && (
                                <div className="text-[10px] text-red-500 font-bold text-center mt-0.5">
                                    {validationErrors.sellerGstNumber}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>

            <div className="flex justify-center mb-8">
                <h2 className="text-3xl font-black tracking-widest border-b-4 border-black pb-1">{invoice.isGST ? 'TAX INVOICE' : 'INVOICE'}</h2>
            </div>

            {/* Place of Supply - GST only */}
            {invoice.isGST && (
                <div className="mb-4 text-center">
                    <div className="flex justify-center gap-6 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={invoice.isIGST || false}
                                onChange={(e) => handleChange('isIGST', null, e.target.checked)} // Special case handled in parent or adapt handleChange
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm font-bold text-slate-700">IGST (Inter-state)</span>
                        </label>
                    </div>

                    <label htmlFor="placeOfSupply" className="text-xs font-bold text-slate-400 uppercase mr-2">Place of Supply:</label>
                    <input
                        id="placeOfSupply"
                        value={invoice.placeOfSupply || ''}
                        onChange={(e) => handleChange('placeOfSupply', null, e.target.value)} // Direct property on invoice
                        className="text-sm font-medium bg-slate-50 border border-slate-200 p-1 rounded focus:border-blue-500 focus:outline-none"
                    />
                </div>
            )}

            {/* Bill To & Details */}
            <div className="flex justify-between items-end mb-8">
                <div className="border-l-4 border-black pl-4 w-1/2">
                    <h3 className="text-sm font-bold text-slate-500 mb-2">BILL TO</h3>
                    <input
                        value={invoice.recipient.name}
                        onChange={(e) => handleChange('recipient', 'name', e.target.value)}
                        className={`text-xl font-bold w-full bg-slate-50 border p-1 rounded focus:border-blue-500 focus:outline-none mb-1 ${validationErrors.clientName ? 'border-red-500 bg-red-50' : 'border-slate-200'
                            }`}
                        aria-label="Client Name"
                    />

                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-400">Mobile:</span>
                        <label htmlFor="client-mobile" className="sr-only">Client Mobile</label>
                        <input
                            value={invoice.recipient.mobile}
                            onChange={(e) => handleChange('recipient', 'mobile', e.target.value)}
                            className={`text-sm font-medium bg-slate-50 border p-1 rounded focus:border-blue-500 focus:outline-none w-40 ${validationErrors.clientMobile ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                }`}
                            placeholder="Mobile Number"
                            id="client-mobile"
                        />
                    </div>

                    {invoice.isGST && (
                        <>
                            <textarea
                                value={invoice.recipient.address || ''}
                                onChange={(e) => handleChange('recipient', 'address', e.target.value)}
                                placeholder="Full Address"
                                className="text-sm font-medium bg-slate-50 border border-slate-200 p-2 rounded focus:border-blue-500 focus:outline-none w-full mb-1 resize-none"
                                rows={2}
                            />
                            <input
                                value={invoice.recipient.gstNumber || ''}
                                onChange={(e) => handleChange('recipient', 'gstNumber', e.target.value)}
                                placeholder="GSTIN"
                                className={`text-sm font-medium bg-slate-50 border px-2 py-1 rounded focus:border-blue-500 focus:outline-none w-full mb-1 ${validationErrors.gstNumber ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            />
                            {validationErrors.gstNumber && <div className="text-[10px] text-red-500 font-bold text-right mb-1">{validationErrors.gstNumber}</div>}
                            <input
                                value={invoice.recipient.state || ''}
                                onChange={(e) => handleChange('recipient', 'state', e.target.value)}
                                placeholder="State"
                                className="text-sm font-medium bg-slate-50 border border-slate-200 p-1 rounded focus:border-blue-500 focus:outline-none w-full"
                            />
                        </>
                    )}
                </div>

                <div className="text-right space-y-2">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Invoice #</span>
                        <input
                            value={invoice.number}
                            onChange={(e) => handleChange('number', null, e.target.value)} // Direct
                            className={`text-right font-bold bg-slate-50 border p-1 rounded focus:border-blue-500 w-24 ${validationErrors.invoiceNumber ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                }`}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Date</span>
                        <input
                            type="date"
                            value={invoice.date}
                            onChange={(e) => handleChange('date', null, e.target.value)} // Direct
                            className="text-right font-medium bg-slate-50 border border-slate-200 p-1 rounded focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
