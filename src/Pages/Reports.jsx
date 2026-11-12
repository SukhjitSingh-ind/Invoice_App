import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Package, Users, DollarSign, FileSpreadsheet, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';
import {
    getSummaryStats,
    getItemSalesReport,
    getClientPurchaseReport,
    getTopItemsByQuantity,
    getTopItemsByRevenue
} from '../services/reportService';
import { useToast } from '../components/Toast';

// Color palette for charts
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16', '#f97316', '#14b8a6'];

export default function Reports() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [itemSales, setItemSales] = useState([]);
    const [clientPurchases, setClientPurchases] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedClients, setExpandedClients] = useState(new Set());
    const [expandedItems, setExpandedItems] = useState(new Set());
    const { addToast } = useToast();

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = () => {
        setSummary(getSummaryStats());
        setItemSales(getItemSalesReport());
        setClientPurchases(getClientPurchaseReport());
    };

    const toggleClientExpand = (clientName) => {
        const newExpanded = new Set(expandedClients);
        if (newExpanded.has(clientName)) {
            newExpanded.delete(clientName);
        } else {
            newExpanded.add(clientName);
        }
        setExpandedClients(newExpanded);
    };

    const toggleItemExpand = (itemName) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemName)) {
            newExpanded.delete(itemName);
        } else {
            newExpanded.add(itemName);
        }
        setExpandedItems(newExpanded);
    };

    const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            const timestamp = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
            addToast('Report exported to Excel successfully!', 'success');
        } catch (error) {
            addToast('Failed to export to Excel', 'error');
        }
    };

    const handleExportAll = () => {
        // Create comprehensive report with multiple sheets
        const workbook = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [{
            'Metric': 'Total Revenue',
            'Value': `₹${summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        }, {
            'Metric': 'Total Invoices',
            'Value': summary.totalInvoices
        }, {
            'Metric': 'Unique Clients',
            'Value': summary.uniqueClients
        }, {
            'Metric': 'Items Sold',
            'Value': summary.uniqueItems
        }];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Items sheet
        const itemsData = itemSales.map(item => ({
            'Item Name': item.itemName,
            'Quantity Sold': item.totalQuantity,
            'Total Revenue': `₹${item.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Times Sold': item.timesSold,
            'Average Price': `₹${item.averagePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Min Price': `₹${item.minPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Max Price': `₹${item.maxPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        }));
        const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Item Sales');

        // Clients sheet
        const clientsData = clientPurchases.map(client => ({
            'Client Name': client.clientName,
            'Total Invoices': client.totalInvoices,
            'Total Spent': `₹${client.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Items Purchased': client.itemsPurchased.length
        }));
        const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
        XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clients');

        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `complete_report_${timestamp}.xlsx`);
        addToast('Complete report exported to Excel!', 'success');
    };

    const handleExportItems = () => {
        const itemsData = filteredItems.map(item => ({
            'Item Name': item.itemName,
            'Quantity Sold': item.totalQuantity,
            'Total Revenue': item.totalRevenue,
            'Times Sold': item.timesSold,
            'Average Price': item.averagePrice,
            'Min Price': item.minPrice,
            'Max Price': item.maxPrice
        }));
        exportToExcel(itemsData, 'item_sales_report', 'Item Sales');
    };

    const handleExportClients = () => {
        const clientsData = filteredClients.map(client => ({
            'Client Name': client.clientName,
            'Total Invoices': client.totalInvoices,
            'Total Spent': client.totalSpent,
            'Items Purchased': client.itemsPurchased.length
        }));
        exportToExcel(clientsData, 'client_purchase_report', 'Clients');
    };

    const filteredItems = itemSales.filter(item =>
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredClients = clientPurchases.filter(client =>
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Prepare data for pie charts
    const topItemsByRevenue = getTopItemsByRevenue(5).map((item, index) => ({
        name: item.itemName.length > 20 ? item.itemName.substring(0, 20) + '...' : item.itemName,
        value: item.totalRevenue,
        fullName: item.itemName
    }));

    const topItemsByQuantity = getTopItemsByQuantity(5).map((item, index) => ({
        name: item.itemName.length > 20 ? item.itemName.substring(0, 20) + '...' : item.itemName,
        value: item.totalQuantity,
        fullName: item.itemName
    }));

    const topClientsBySpending = clientPurchases.slice(0, 5).map((client, index) => ({
        name: client.clientName.length > 20 ? client.clientName.substring(0, 20) + '...' : client.clientName,
        value: client.totalSpent,
        fullName: client.clientName
    }));

    if (!summary) return <div>Loading...</div>;

    const hasData = summary.totalInvoices > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
                        <BarChart3 className="text-blue-600" size={36} />
                        Reports & Analytics
                    </h1>
                    <p className="text-slate-600 text-lg">Business insights and performance metrics</p>
                </div>

                {/* Empty state when no invoices exist */}
                {!hasData && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 text-center">
                        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                            <BarChart3 className="text-blue-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No data to analyze yet</h3>
                        <p className="text-slate-500 mb-6">
                            Create a few invoices first and then come back here to see revenue trends, top clients, and item performance.
                        </p>
                        <button
                            onClick={() => navigate('/create')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                        >
                            Create Your First Invoice
                        </button>
                    </div>
                )}

                {hasData && (
                    <>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <DollarSign size={32} className="opacity-80" />
                            <h3 className="text-lg font-bold opacity-90">Total Revenue</h3>
                        </div>
                        <p className="text-3xl font-black">₹{summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart3 size={32} className="opacity-80" />
                            <h3 className="text-lg font-bold opacity-90">Total Invoices</h3>
                        </div>
                        <p className="text-3xl font-black">{summary.totalInvoices}</p>
                    </div>

                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Users size={32} className="opacity-80" />
                            <h3 className="text-lg font-bold opacity-90">Unique Clients</h3>
                        </div>
                        <p className="text-3xl font-black">{summary.uniqueClients}</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Package size={32} className="opacity-80" />
                            <h3 className="text-lg font-bold opacity-90">Items Sold</h3>
                        </div>
                        <p className="text-3xl font-black">{summary.uniqueItems}</p>
                    </div>
                </div>

                {/* Pie Charts Section */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Top Items by Revenue */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <TrendingUp className="text-blue-600" size={20} />
                            Top Items by Revenue
                        </h3>
                        {topItemsByRevenue.length > 0 ? (
                            <div className="pt-4">
                                <ResponsiveContainer width="100%" height={320}>
                                    <PieChart>
                                        <Pie
                                            data={topItemsByRevenue}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            outerRadius={65}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {topItemsByRevenue.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={90}
                                            wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-12">No data available</p>
                        )}
                    </div>

                    {/* Top Items by Quantity */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Package className="text-purple-600" size={20} />
                            Top Items by Quantity
                        </h3>
                        {topItemsByQuantity.length > 0 ? (
                            <div className="pt-4">
                                <ResponsiveContainer width="100%" height={320}>
                                    <PieChart>
                                        <Pie
                                            data={topItemsByQuantity}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            outerRadius={65}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {topItemsByQuantity.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={90}
                                            wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-12">No data available</p>
                        )}
                    </div>

                    {/* Top Clients by Spending */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Users className="text-pink-600" size={20} />
                            Top Clients by Spending
                        </h3>
                        {topClientsBySpending.length > 0 ? (
                            <div className="pt-4">
                                <ResponsiveContainer width="100%" height={320}>
                                    <PieChart>
                                        <Pie
                                            data={topClientsBySpending}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            outerRadius={65}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {topClientsBySpending.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={90}
                                            wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-12">No data available</p>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-6">
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search items or clients..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleExportAll}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 whitespace-nowrap"
                        >
                            <FileSpreadsheet size={20} />
                            Export to Excel
                        </button>
                    </div>
                </div>

                {/* Item Sales Analysis */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="text-blue-600" size={24} />
                            Item Sales Analysis
                        </h2>
                        <button
                            onClick={handleExportItems}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            <FileSpreadsheet size={16} />
                            Export to Excel
                        </button>
                    </div>

                    {filteredItems.length === 0 ? (
                        <p className="text-slate-500 text-center py-12">No items found</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="py-3 px-4 text-left font-bold text-sm text-slate-700">Item Name</th>
                                        <th className="py-3 px-4 text-center font-bold text-sm text-slate-700">Qty Sold</th>
                                        <th className="py-3 px-4 text-right font-bold text-sm text-slate-700">Total Revenue</th>
                                        <th className="py-3 px-4 text-center font-bold text-sm text-slate-700">Times Sold</th>
                                        <th className="py-3 px-4 text-right font-bold text-sm text-slate-700">Avg Price</th>
                                        <th className="py-3 px-4 text-right font-bold text-sm text-slate-700">Min Price</th>
                                        <th className="py-3 px-4 text-right font-bold text-sm text-slate-700">Max Price</th>
                                        <th className="py-3 px-4 text-center font-bold text-sm text-slate-700">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map((item, index) => (
                                        <React.Fragment key={index}>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-slate-900">{item.itemName}</td>
                                                <td className="py-3 px-4 text-center text-slate-700">{item.totalQuantity}</td>
                                                <td className="py-3 px-4 text-right font-bold text-blue-600">
                                                    ₹{item.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-700">{item.timesSold}</td>
                                                <td className="py-3 px-4 text-right text-slate-700">
                                                    ₹{item.averagePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-right text-green-600 font-medium">
                                                    ₹{item.minPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-right text-red-600 font-medium">
                                                    ₹{item.maxPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => toggleItemExpand(item.itemName)}
                                                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                                    >
                                                        {expandedItems.has(item.itemName) ? (
                                                            <ChevronUp size={16} className="text-blue-600" />
                                                        ) : (
                                                            <ChevronDown size={16} className="text-blue-600" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedItems.has(item.itemName) && (
                                                <tr>
                                                    <td colSpan="8" className="bg-slate-50 p-4">
                                                        <h4 className="font-bold text-slate-700 mb-2">Price History</h4>
                                                        <div className="space-y-2">
                                                            {item.priceInstances.map((instance, idx) => (
                                                                <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg">
                                                                    <span className="text-slate-600">{instance.date}</span>
                                                                    <span className="font-medium text-slate-900">{instance.clientName}</span>
                                                                    <span className="text-slate-600">Qty: {instance.quantity}</span>
                                                                    <span className="font-bold text-blue-600">₹{instance.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                    <span className="text-slate-500">Invoice #{instance.invoiceNumber}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Client Purchase Analysis */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="text-purple-600" size={24} />
                            Client Purchase Analysis
                        </h2>
                        <button
                            onClick={handleExportClients}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                            <FileSpreadsheet size={16} />
                            Export to Excel
                        </button>
                    </div>

                    {filteredClients.length === 0 ? (
                        <p className="text-slate-500 text-center py-12">No clients found</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="py-3 px-4 text-left font-bold text-sm text-slate-700">Client Name</th>
                                        <th className="py-3 px-4 text-center font-bold text-sm text-slate-700">Total Invoices</th>
                                        <th className="py-3 px-4 text-right font-bold text-sm text-slate-700">Total Spent</th>
                                        <th className="py-3 px-4 text-center font-bold text-sm text-slate-700">Items Purchased</th>
                                        <th className="py-3 px-4 text-center font-bold text-sm text-slate-700">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredClients.map((client, index) => (
                                        <React.Fragment key={index}>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-slate-900">{client.clientName}</td>
                                                <td className="py-3 px-4 text-center text-slate-700">{client.totalInvoices}</td>
                                                <td className="py-3 px-4 text-right font-bold text-purple-600">
                                                    ₹{client.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-700">{client.itemsPurchased.length}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => toggleClientExpand(client.clientName)}
                                                        className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                                    >
                                                        {expandedClients.has(client.clientName) ? (
                                                            <ChevronUp size={16} className="text-purple-600" />
                                                        ) : (
                                                            <ChevronDown size={16} className="text-purple-600" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedClients.has(client.clientName) && (
                                                <tr>
                                                    <td colSpan="5" className="bg-slate-50 p-4">
                                                        <h4 className="font-bold text-slate-700 mb-2">Items Purchased</h4>
                                                        <div className="grid md:grid-cols-2 gap-3">
                                                            {client.itemsPurchased.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg">
                                                                    <span className="font-medium text-slate-900">{item.itemName}</span>
                                                                    <div className="flex gap-4">
                                                                        <span className="text-slate-600">Qty: {item.quantity}</span>
                                                                        <span className="font-bold text-purple-600">
                                                                            ₹{item.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                    </>
                )}
            </div>
        </div>
    );
}
