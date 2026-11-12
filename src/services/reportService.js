import { getAllInvoices } from './invoiceService';

/**
 * Normalize item name for comparison
 * @param {string} name - Item name to normalize
 * @returns {string} Normalized name
 */
const normalizeItemName = (name) => {
    return (name || '').trim().toLowerCase();
};

/**
 * Calculate total price for an invoice item including GST
 * @param {Object} item - Invoice item
 * @param {boolean} isGST - Whether invoice has GST
 * @returns {number} Total price including GST
 */
const calculateItemTotal = (item, isGST) => {
    const baseTotal = (item.quantity || 0) * (item.price || 0);
    if (isGST) {
        const gstRate = item.gstRate !== undefined ? item.gstRate : 18;
        return baseTotal * (1 + gstRate / 100);
    }
    return baseTotal;
};

/**
 * Get comprehensive item sales report
 * @returns {Array} Array of item sales statistics
 */
export const getItemSalesReport = () => {
    const invoices = getAllInvoices();
    const itemMap = new Map();

    invoices.forEach(invoice => {
        const isGST = invoice.isGST || false;

        invoice.items?.forEach(item => {
            const normalizedName = normalizeItemName(item.description);
            if (!normalizedName) return;

            const itemTotal = calculateItemTotal(item, isGST);

            if (!itemMap.has(normalizedName)) {
                itemMap.set(normalizedName, {
                    itemName: item.description.trim(),
                    totalQuantity: 0,
                    totalRevenue: 0,
                    timesSold: 0,
                    prices: [],
                    priceInstances: []
                });
            }

            const stats = itemMap.get(normalizedName);
            stats.totalQuantity += item.quantity || 0;
            stats.totalRevenue += itemTotal;
            stats.timesSold += 1;
            stats.prices.push(item.price);
            stats.priceInstances.push({
                date: invoice.date,
                price: item.price,
                quantity: item.quantity,
                clientName: invoice.recipient?.name || 'Unknown',
                invoiceNumber: invoice.number,
                invoiceId: invoice.id
            });
        });
    });

    // Calculate min, max, avg prices
    const results = Array.from(itemMap.values()).map(stats => ({
        ...stats,
        averagePrice: stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length,
        minPrice: Math.min(...stats.prices),
        maxPrice: Math.max(...stats.prices),
        priceInstances: stats.priceInstances.sort((a, b) => new Date(b.date) - new Date(a.date))
    }));

    results.forEach(item => delete item.prices);

    return results;
};

/**
 * Get client purchase analysis
 * @returns {Array} Array of client purchase statistics
 */
export const getClientPurchaseReport = () => {
    const invoices = getAllInvoices();
    const clientMap = new Map();

    invoices.forEach(invoice => {
        const clientName = invoice.recipient?.name?.trim() || 'Unknown Client';
        const normalizedClient = clientName.toLowerCase();
        const isGST = invoice.isGST || false;

        if (!clientMap.has(normalizedClient)) {
            clientMap.set(normalizedClient, {
                clientName: clientName,
                totalInvoices: 0,
                totalSpent: 0,
                itemsPurchased: new Map()
            });
        }

        const clientStats = clientMap.get(normalizedClient);
        clientStats.totalInvoices += 1;

        let invoiceTotal = 0;
        invoice.items?.forEach(item => {
            const itemTotal = calculateItemTotal(item, isGST);
            invoiceTotal += itemTotal;

            const normalizedItemName = normalizeItemName(item.description);
            if (!normalizedItemName) return;

            if (!clientStats.itemsPurchased.has(normalizedItemName)) {
                clientStats.itemsPurchased.set(normalizedItemName, {
                    itemName: item.description.trim(),
                    quantity: 0,
                    totalCost: 0
                });
            }

            const itemStats = clientStats.itemsPurchased.get(normalizedItemName);
            itemStats.quantity += item.quantity || 0;
            itemStats.totalCost += itemTotal;
        });

        const discountValue = parseFloat(invoice.discountValue || 0);
        const discountAmount = invoice.discountType === 'percentage'
            ? (invoiceTotal * discountValue / 100)
            : discountValue;

        clientStats.totalSpent += Math.max(0, invoiceTotal - discountAmount);
    });

    const results = Array.from(clientMap.values()).map(stats => ({
        ...stats,
        itemsPurchased: Array.from(stats.itemsPurchased.values())
            .sort((a, b) => b.totalCost - a.totalCost)
    }));

    return results.sort((a, b) => b.totalSpent - a.totalSpent);
};

/**
 * Get top items by quantity sold
 * @param {number} limit - Number of top items to return
 * @returns {Array} Top items by quantity
 */
export const getTopItemsByQuantity = (limit = 10) => {
    const itemSales = getItemSalesReport();
    return itemSales
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, limit);
};

/**
 * Get top items by revenue
 * @param {number} limit - Number of top items to return
 * @returns {Array} Top items by revenue
 */
export const getTopItemsByRevenue = (limit = 10) => {
    const itemSales = getItemSalesReport();
    return itemSales
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
};

/**
 * Get top clients by total spending
 * @param {number} limit - Number of top clients to return
 * @returns {Array} Top clients by revenue
 */
export const getTopClientsByRevenue = (limit = 10) => {
    const clientReport = getClientPurchaseReport();
    return clientReport.slice(0, limit);
};

/**
 * Get summary statistics
 * @returns {Object} Summary statistics
 */
export const getSummaryStats = () => {
    const invoices = getAllInvoices();
    const itemSales = getItemSalesReport();
    const clientReport = getClientPurchaseReport();

    let totalRevenue = 0;
    invoices.forEach(invoice => {
        const isGST = invoice.isGST || false;
        let invoiceTotal = 0;

        invoice.items?.forEach(item => {
            invoiceTotal += calculateItemTotal(item, isGST);
        });

        // Apply discount
        const discountValue = parseFloat(invoice.discountValue || 0);
        const discountAmount = invoice.discountType === 'percentage'
            ? (invoiceTotal * discountValue / 100)
            : discountValue;

        totalRevenue += Math.max(0, invoiceTotal - discountAmount);
    });

    return {
        totalRevenue,
        totalInvoices: invoices.length,
        uniqueClients: clientReport.length,
        uniqueItems: itemSales.length
    };
};

/**
 * Get item performance metrics
 * @param {string} itemName - Name of the item
 * @returns {Object|null} Item performance data or null if not found
 */
export const getItemPerformanceMetrics = (itemName) => {
    const itemSales = getItemSalesReport();
    const normalizedName = normalizeItemName(itemName);

    return itemSales.find(item => normalizeItemName(item.itemName) === normalizedName) || null;
};

/**
 * Export report data to JSON
 * @param {string} reportType - Type of report ('items', 'clients', 'summary')
 */
export const exportReportToJSON = (reportType = 'all') => {
    let data;
    let filename;

    switch (reportType) {
        case 'items':
            data = getItemSalesReport();
            filename = 'item_sales_report';
            break;
        case 'clients':
            data = getClientPurchaseReport();
            filename = 'client_purchase_report';
            break;
        case 'summary':
            data = getSummaryStats();
            filename = 'summary_report';
            break;
        default:
            data = {
                summary: getSummaryStats(),
                itemSales: getItemSalesReport(),
                clientPurchases: getClientPurchaseReport()
            };
            filename = 'complete_report';
    }

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `${filename}_${timestamp}.json`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
