import React from 'react';
import { Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function InvoiceItemsTable({
    invoice,
    handleItemChange,
    removeItem,
    addItem,
    handleSort,
    sortConfig,
    baseSortIcon,
    validationErrors,
    subtotal,
    igstAmount,
    cgstAmount,
    sgstAmount,
    discountAmount,
    total,
    setInvoice
}) {

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
    };

    return (
        <div className="mb-8">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-y-2 border-black">
                        <th
                            className="py-3 text-left font-bold text-sm uppercase tracking-wider pl-2 cursor-pointer group hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('description')}
                        >
                            <div className="flex items-center gap-1">
                                Item Description {getSortIcon('description')}
                            </div>
                        </th>
                        {invoice.isGST && <th className="py-3 text-center font-bold text-sm uppercase tracking-wider w-24">HSN/SAC</th>}
                        <th
                            className="py-3 text-center font-bold text-sm uppercase tracking-wider w-20 cursor-pointer group hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('quantity')}
                        >
                            <div className="flex items-center justify-center gap-1">
                                Qty {getSortIcon('quantity')}
                            </div>
                        </th>
                        <th
                            className="py-3 text-right font-bold text-sm uppercase tracking-wider w-24 cursor-pointer group hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('price')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Rate {getSortIcon('price')}
                            </div>
                        </th>
                        {invoice.isGST && <th className="py-3 text-center font-bold text-sm uppercase tracking-wider w-24">GST %</th>}
                        <th
                            className="py-3 text-right font-bold text-sm uppercase tracking-wider w-32 cursor-pointer group hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('amount')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Amount {getSortIcon('amount')}
                            </div>
                        </th>
                        <th className="w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-2">
                                <input
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    className={`w-full p-2 bg-transparent border rounded font-semibold text-slate-800 focus:outline-none ${validationErrors[`description_${item.id}`]
                                        ? 'border-red-500 bg-red-50 focus:bg-red-50 focus:border-red-500'
                                        : 'border-transparent focus:bg-white focus:border-blue-500'
                                        }`}
                                />
                            </td>
                            {invoice.isGST && (
                                <td className="py-2">
                                    <input
                                        value={item.hsnSac || ''}
                                        onChange={(e) => handleItemChange(item.id, 'hsnSac', e.target.value)}
                                        placeholder="HSN/SAC"
                                        className="w-full text-center p-2 bg-transparent border border-transparent focus:bg-white focus:border-blue-500 rounded font-medium focus:outline-none text-sm"
                                    />
                                </td>
                            )}
                            <td className="py-2">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                                    className={`w-full text-center p-2 bg-transparent border rounded font-medium focus:outline-none ${validationErrors[`quantity_${item.id}`]
                                        ? 'border-red-500 bg-red-50 focus:bg-red-50 focus:border-red-500'
                                        : 'border-transparent focus:bg-white focus:border-blue-500'
                                        }`}
                                />
                            </td>
                            <td className="py-2">
                                <input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                                    className={`w-full text-right p-2 bg-transparent border rounded font-medium focus:outline-none ${validationErrors[`price_${item.id}`]
                                        ? 'border-red-500 bg-red-50 focus:bg-red-50 focus:border-red-500'
                                        : 'border-transparent focus:bg-white focus:border-blue-500'
                                        }`}
                                />
                            </td>
                            {invoice.isGST && (
                                <td className="py-2 px-2 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <input
                                            type="number"
                                            value={item.gstRate !== undefined ? item.gstRate : 18}
                                            onChange={(e) => handleItemChange(item.id, 'gstRate', parseFloat(e.target.value))}
                                            className="w-16 text-center p-1 bg-transparent border border-slate-200 rounded font-medium focus:bg-white focus:border-blue-500 focus:outline-none text-sm"
                                        />
                                        <span className="text-xs text-slate-500">
                                            ₹ {((item.quantity * item.price) * ((item.gstRate !== undefined ? item.gstRate : 18) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </td>
                            )}
                            <td className="py-2 text-right text-sm font-bold px-2">
                                {(item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 text-center">
                                <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={invoice.isGST ? "8" : "5"} className="pt-4">
                            <button onClick={addItem} className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-400 font-bold rounded hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2 transition-all">
                                <Plus size={20} /> Add New Item Line
                            </button>
                        </td>
                    </tr>
                    {invoice.isGST && (
                        <>
                            <tr className="border-t border-slate-200">
                                <td colSpan="3" className="py-2 text-right font-bold pr-8">Subtotal</td>
                                <td className="py-2 text-right font-bold text-slate-700 px-2">
                                    {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                            </tr>
                            {invoice.isIGST ? (
                                <tr>
                                    <td colSpan="3" className="py-2 text-right pr-8">
                                        <span className="text-sm">IGST</span>
                                    </td>
                                    <td className="py-2 text-right text-sm px-2">
                                        {igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            ) : (
                                <>
                                    <tr>
                                        <td colSpan="3" className="py-2 text-right pr-8">
                                            <span className="text-sm">CGST</span>
                                        </td>
                                        <td className="py-2 text-right text-sm px-2">
                                            {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td colSpan="3" className="py-2 text-right pr-8">
                                            <span className="text-sm">SGST</span>
                                        </td>
                                        <td className="py-2 text-right text-sm px-2">
                                            {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </>
                            )}
                        </>
                    )}
                    {/* Discount Row */}
                    <tr className="border-t border-slate-200">
                        <td colSpan="3" className="py-2 text-right pr-8">
                            <div className="flex justify-end items-center gap-2">
                                <input
                                    value={invoice.discountLabel || 'Discount'}
                                    onChange={(e) => setInvoice(prev => ({ ...prev, discountLabel: e.target.value }))}
                                    className="text-right text-sm font-bold text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-24 placeholder-slate-300"
                                    placeholder="Label"
                                />
                                <div className="flex bg-slate-100 rounded p-0.5 border border-slate-200">
                                    <button
                                        onClick={() => setInvoice(prev => ({ ...prev, discountType: 'fixed' }))}
                                        className={`px-2 py-0.5 text-xs font-bold rounded ${invoice.discountType !== 'percentage' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        ₹
                                    </button>
                                    <button
                                        onClick={() => setInvoice(prev => ({ ...prev, discountType: 'percentage' }))}
                                        className={`px-2 py-0.5 text-xs font-bold rounded ${invoice.discountType === 'percentage' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        %
                                    </button>
                                </div>
                            </div>
                        </td>
                        <td className="py-2 text-right px-2">
                            <input
                                type="number"
                                min="0"
                                value={invoice.discountValue || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || parseFloat(val) >= 0) {
                                        setInvoice(prev => ({ ...prev, discountValue: val }));
                                    }
                                }}
                                className="w-full text-right bg-slate-50 border border-slate-200 p-1 rounded focus:border-blue-500 focus:outline-none font-medium text-sm"
                                placeholder="0"
                            />
                        </td>
                        <td className="py-2 pl-2 text-xs text-slate-400">
                            {invoice.discountType === 'percentage' && invoice.discountValue > 0 &&
                                `(-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                            }
                        </td>
                    </tr>

                    <tr className="border-t-2 border-black">
                        <td colSpan="3" className="py-4 text-right text-xl font-bold pr-8">Total</td>
                        <td className="py-4 text-right text-xl font-black text-slate-900 px-2">
                            {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
