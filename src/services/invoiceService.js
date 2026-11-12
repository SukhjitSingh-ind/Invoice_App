import { getActiveProfile } from './settingsService';
const STORAGE_KEY = 'invoice_app_data';

// Default initial data to start with if storage is empty
const INITIAL_DATA = [
    {
        id: 1731427200000, // Timestamp as ID
        number: '#9',
        date: '2025-11-22',
        sender: {
            name: 'GK AUTO ELECTRIC WORKS',
            address: 'ISHWAR ARCADE shop no 11 asalali Cross\nroad nearby Kheda road Ahmedabad Gujarat.',
            phone: '',
            gstNumber: ''
        },
        recipient: {
            name: 'Guru Kripa Crane Service',
            mobile: '8141378031'
        },
        items: [
            { id: 1, description: 'Bosch ECM Repairing', quantity: 1, price: 25500 },
            { id: 2, description: 'Mundra Breakdown Service Charge', quantity: 1, price: 10000 },
            { id: 3, description: 'Laptop Scanning', quantity: 1, price: 3500 },
            { id: 4, description: 'Mundra Up/Down Service (Travel/Transport)', quantity: 1, price: 3500 },
            { id: 5, description: 'Mundra breakdown service ECM wiring check', quantity: 1, price: 7500 }
        ],
        currency: '₹',
        notes: 'Zoomlion Crane (80 Ton)',
        paymentInfo: '8141378031mokbizar',
        template: 'default'
    }
];

export const getAllInvoices = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
            return INITIAL_DATA;
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading invoices:', error);
        return INITIAL_DATA;
    }
};

export const getInvoice = (id) => {
    const invoices = getAllInvoices();
    // Handle both string and number IDs
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return invoices.find(inv => inv.id === numId);
};

export const saveInvoice = (invoice) => {
    try {
        const invoices = getAllInvoices();
        if (invoice.id) {
            // Update existing
            const index = invoices.findIndex(inv => inv.id === invoice.id);
            if (index !== -1) {
                invoices[index] = invoice;
            } else {
                invoices.push(invoice);
            }
        } else {
            // Create new
            invoice.id = Date.now();
            invoices.push(invoice);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
        return invoice;
    } catch (error) {
        console.error('Error saving invoice:', error);
        return invoice;
    }
};

export const deleteInvoice = (id) => {
    try {
        let invoices = getAllInvoices();
        // Handle both string and number IDs
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;



        invoices = invoices.filter(inv => inv.id !== numId);



        localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
        return true;
    } catch (error) {
        console.error('Error deleting invoice:', error);
        return false;
    }
};

export const createEmptyInvoice = () => {
    const profile = getActiveProfile();
    const defaults = {
        name: '',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
        bankDetails: {
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            accountHolder: ''
        }
    };

    // Use profile data or fallbacks
    const sender = profile || defaults;

    return {
        number: '',
        date: new Date().toISOString().split('T')[0],
        sender: {
            name: sender.name || '',
            address: sender.address || '',
            phone: sender.phone || '',
            email: sender.email || '',
            gstNumber: sender.gstNumber || '',
            // If profile has specific state logic, add it here, otherwise default or manual
            state: sender.state || '24-Gujarat' // Default if not set
        },
        recipient: {
            name: '',
            mobile: '',
            address: '',
            gstNumber: '',
            state: ''
        },
        placeOfSupply: '',
        items: [],
        currency: '₹',
        notes: '',
        termsAndConditions: '',
        paymentInfo: '',
        bankDetails: {
            bankName: sender.bankDetails?.bankName || '',
            accountNumber: sender.bankDetails?.accountNumber || '',
            ifscCode: sender.bankDetails?.ifscCode || '',
            accountHolder: sender.bankDetails?.accountHolder || ''
        },
        isGST: false,
        isIGST: false,
        gstRate: 18,
        cgst: 9,
        sgst: 9,
        received: 0,
        discountType: 'fixed',
        discountValue: 0,
        discountLabel: 'Discount',
        customization: {
            backgroundColor: '',
            fontColor: '',
            backgroundImage: ''
        }
    };
};

export const getNextInvoiceNumber = () => {
    const invoices = getAllInvoices();
    if (invoices.length === 0) return '1';

    // Sort by integer ID (timestamp) descending to get truly latest created
    const sorted = [...invoices].sort((a, b) => b.id - a.id);
    const lastInvoice = sorted[0];
    const lastNumStr = lastInvoice.number || '';

    // Try to match pattern ending in number: Prefix + Number
    // e.g. "INV-009" or "#9"
    const match = lastNumStr.match(/^(.*?)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = parseInt(numStr, 10) + 1;
        // Preserve zero padding logic
        const paddedNum = nextNum.toString().padStart(numStr.length, '0');
        return prefix + paddedNum;
    }

    // Fallback: Max of all specific numbers found
    let max = 0;
    invoices.forEach(inv => {
        const m = (inv.number || '').match(/\d+/);
        if (m) {
            const val = parseInt(m[0], 10);
            if (val > max) max = val;
        }
    });

    return (max > 0 ? max + 1 : invoices.length + 1).toString();
};

export const checkInvoiceNumberExists = (number, excludeId = null) => {
    const invoices = getAllInvoices();
    const normalize = n => (n || '').trim().toLowerCase();
    const target = normalize(number);

    return invoices.some(inv =>
        normalize(inv.number) === target &&
        inv.id !== excludeId
    );
};

export const exportInvoices = () => {
    try {
        const invoices = getAllInvoices();
        const dataStr = JSON.stringify(invoices, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `invoices_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error('Error exporting invoices:', error);
        return false;
    }
};

export const importInvoices = (jsonData) => {
    try {
        const newInvoices = JSON.parse(jsonData);

        if (!Array.isArray(newInvoices)) {
            throw new Error('Invalid data format: Expected an array of invoices');
        }

        const currentInvoices = getAllInvoices();
        let addedCount = 0;
        let updatedCount = 0;

        newInvoices.forEach(newInv => {
            // Basic validation: ensure ID and number exist
            if (!newInv.id || !newInv.number) return;

            const index = currentInvoices.findIndex(inv => inv.id === newInv.id);
            if (index !== -1) {
                // Update existing? Or skip? Let's skip for safety to avoid overwriting unless explictly requested, 
                // BUT for simple restore, maybe we want to update.
                // Let's go with: Merge strategy -> If ID matches, we keep the LOCAL version to be safe, 
                // OR we can make a choice. A better 'restore' overrides.
                // Let's assume 'backup restore' implies overriding or adding missing.
                // For now, let's ADD only if not exists to be non-destructive by default.
                // actually, let's simply overwrite if it exists to allow restoring old state.
                currentInvoices[index] = newInv;
                updatedCount++;
            } else {
                currentInvoices.push(newInv);
                addedCount++;
            }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentInvoices));
        return { success: true, added: addedCount, updated: updatedCount };
    } catch (error) {
        console.error('Error importing invoices:', error);
        return { success: false, message: error.message };
    }
};