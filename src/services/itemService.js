const STORAGE_KEY = 'invoice_app_items';

/**
 * Get all items from localStorage
 * @returns {Array} Array of item objects
 */
export const getAllItems = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading items:', error);
        return [];
    }
};

/**
 * Save all items to localStorage
 * @param {Array} items - Array of item objects
 */
const saveItems = (items) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Error saving items:', error);
    }
};

/**
 * Get single item by ID
 * @param {number|string} id - Item ID
 * @returns {Object|null} Item object or null if not found
 */
export const getItem = (id) => {
    const items = getAllItems();
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return items.find(item => item.id === numId) || null;
};

/**
 * Create a new item
 * @param {Object} itemData - Item data for the new item
 * @returns {Object} The newly created item object
 */
export const createItem = (itemData) => {
    const items = getAllItems();
    const newItem = {
        id: Date.now(),
        ...itemData,
        priceHistory: itemData.priceHistory || [
            { price: itemData.defaultPrice, date: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
    };
    items.push(newItem);
    saveItems(items);
    return newItem;
};

/**
 * Update an existing item by ID
 * @param {number|string} id - The ID of the item to update
 * @param {Object} itemData - The data to update the item with
 * @returns {Object|null} The updated item object, or null if not found
 */
export const updateItem = (id, itemData) => {
    const items = getAllItems();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
        const currentItem = items[index];
        const newPrice = itemData.defaultPrice;
        let priceHistory = currentItem.priceHistory || [];

        // If history is empty but we have a current price, initialize it
        if (priceHistory.length === 0 && currentItem.defaultPrice !== undefined) {
            priceHistory.push({
                price: currentItem.defaultPrice,
                date: currentItem.createdAt || new Date().toISOString()
            });
        }

        // If price has changed, add to history
        if (newPrice !== undefined && newPrice !== currentItem.defaultPrice) {
            priceHistory.push({
                price: newPrice,
                date: new Date().toISOString()
            });
        }

        items[index] = {
            ...currentItem,
            ...itemData,
            priceHistory,
            id, // Preserve the original ID
            updatedAt: new Date().toISOString()
        };
        saveItems(items);
        return items[index];
    }
    return null;
};

/**
 * Save item (create or update)
 * @param {Object} item - Item object
 * @returns {Object} Saved item object
 */
export const saveItem = (item) => {
    // If item has an ID, update it
    if (item.id) {
        return updateItem(item.id, item);
    }

    // Otherwise create new
    return createItem(item);
};

/**
 * Delete item by ID
 * @param {number|string} id - Item ID
 * @returns {boolean} Success status
 */
export const deleteItem = (id) => {
    try {
        let items = getAllItems();
        // Convert both to string for reliable comparison
        items = items.filter(item => String(item.id) !== String(id));

        saveItems(items);
        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        return false;
    }
};

/**
 * Create empty item object
 * @returns {Object} Empty item object with default values
 */
export const createEmptyItem = () => {
    return {
        name: '',
        description: '',
        defaultPrice: 0,
        hsnSac: '',
        unit: 'Pcs',
        gstRate: 18,
        priceHistory: []
    };
};

/**
 * Export all items to a downloadable JSON file
 * @returns {void}
 */
export const exportItemsToJSON = () => {
    try {
        const items = getAllItems();
        const jsonString = JSON.stringify(items, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `items_backup_${timestamp}.json`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting items:', error);
        throw new Error('Failed to export items');
    }
};

/**
 * Import items from a JSON string
 * @param {string} jsonData - JSON string containing item data
 * @returns {Object} Object with success status and count of imported items
 * @throws {Error} If JSON is invalid or has incorrect structure
 */
export const importItemsFromJSON = (jsonData) => {
    try {
        // Parse JSON
        const importedItems = JSON.parse(jsonData);

        // Validate structure
        if (!Array.isArray(importedItems)) {
            throw new Error('Invalid JSON format: Expected an array of items');
        }

        // Validate each item has required fields
        for (let i = 0; i < importedItems.length; i++) {
            const item = importedItems[i];
            if (!item.name || typeof item.name !== 'string') {
                throw new Error(`Invalid item at index ${i}: Missing or invalid 'name' field`);
            }
            if (item.defaultPrice === undefined || typeof item.defaultPrice !== 'number') {
                throw new Error(`Invalid item at index ${i}: Missing or invalid 'defaultPrice' field`);
            }
        }

        // Get existing items
        const existingItems = getAllItems();

        // Merge imported items (avoiding duplicates by name)
        let importedCount = 0;
        importedItems.forEach(importedItem => {
            const { id, createdAt, updatedAt, ...cleanItemData } = importedItem;

            // Check if item with same name exists
            const existingIndex = existingItems.findIndex(
                e => e.name.toLowerCase().trim() === cleanItemData.name.toLowerCase().trim()
            );

            if (existingIndex !== -1) {
                // Update existing item
                existingItems[existingIndex] = {
                    ...existingItems[existingIndex],
                    ...cleanItemData,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Add new item
                existingItems.push({
                    ...cleanItemData,
                    id: Date.now() + importedCount,
                    createdAt: new Date().toISOString()
                });
            }
            importedCount++;
        });

        saveItems(existingItems);

        return {
            success: true,
            count: importedCount
        };
    } catch (error) {
        console.error('Error importing items:', error);
        throw error;
    }
};
