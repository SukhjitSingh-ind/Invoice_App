import { db } from '../db/db.js';
import { DEFAULT_ITEM_UNIT, DEFAULT_GST_RATE } from '../constants/index.js';

let cachedItems = [];

/**
 * Hydrates items cache from Dexie.
 * @returns {Promise<Array>}
 */
export const loadItemsFromDb = async () => {
    try {
        const items = await db.items.toArray();
        cachedItems = items;
        return items;
    } catch (error) {
        console.error('Error loading items from Dexie:', error);
        return cachedItems;
    }
};

/**
 * Get all items (sync from cache, fallback empty)
 * @returns {Array} Array of item objects
 */
export const getAllItems = () => {
    return cachedItems;
};

/**
 * Get all items asynchronously directly from Dexie
 * @returns {Promise<Array>}
 */
export const getAllItemsAsync = async () => {
    return await loadItemsFromDb();
};

/**
 * Get single item by ID
 * @param {number|string} id - Item ID
 * @returns {Promise<Object|null>} Item object or null if not found
 */
export const getItem = async (id) => {
    if (id === null || id === undefined) return null;
    let item = await db.items.get(id);
    if (!item && typeof id === 'string') {
        const numId = Number(id);
        if (!isNaN(numId)) item = await db.items.get(numId);
    }
    if (!item) {
        item = await db.items.filter(i => String(i.id) === String(id)).first();
    }
    return item || null;
};

/**
 * Create a new item
 * @param {Object} itemData
 * @returns {Promise<Object>}
 */
export const createItem = async (itemData) => {
    const newItem = {
        id: Date.now(),
        ...itemData,
        priceHistory: itemData.priceHistory || [
            { price: itemData.defaultPrice, date: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
    };
    await db.items.put(newItem);
    await loadItemsFromDb();
    return newItem;
};

/**
 * Update an existing item by ID
 * @param {number|string} id
 * @param {Object} itemData
 * @returns {Promise<Object|null>}
 */
export const updateItem = async (id, itemData) => {
    const currentItem = await getItem(id);
    if (!currentItem) return null;

    const newPrice = itemData.defaultPrice;
    let priceHistory = currentItem.priceHistory || [];

    if (priceHistory.length === 0 && currentItem.defaultPrice !== undefined) {
        priceHistory.push({
            price: currentItem.defaultPrice,
            date: currentItem.createdAt || new Date().toISOString()
        });
    }

    if (newPrice !== undefined && newPrice !== currentItem.defaultPrice) {
        priceHistory.push({
            price: newPrice,
            date: new Date().toISOString()
        });
    }

    const updated = {
        ...currentItem,
        ...itemData,
        priceHistory,
        id: currentItem.id,
        updatedAt: new Date().toISOString()
    };

    await db.items.put(updated);
    await loadItemsFromDb();
    return updated;
};

/**
 * Save item (create or update)
 * @param {Object} item
 * @returns {Promise<Object>}
 */
export const saveItem = async (item) => {
    if (item.id) {
        return await updateItem(item.id, item);
    }
    return await createItem(item);
};

/**
 * Delete item by ID
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
export const deleteItem = async (id) => {
    try {
        const existing = await getItem(id);
        const targetId = existing ? existing.id : id;
        await db.items.delete(targetId);
        await loadItemsFromDb();
        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        return false;
    }
};

/**
 * Create empty item object
 * @returns {Object}
 */
export const createEmptyItem = () => {
    return {
        name: '',
        description: '',
        defaultPrice: 0,
        hsnSac: '',
        unit: DEFAULT_ITEM_UNIT,
        gstRate: DEFAULT_GST_RATE,
        priceHistory: []
    };
};

/**
 * Export all items to a downloadable JSON file
 * @returns {Promise<void>}
 */
export const exportItemsToJSON = async () => {
    try {
        const items = await db.items.toArray();
        const jsonString = JSON.stringify(items, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `items_backup_${timestamp}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting items:', error);
        throw new Error('Failed to export items');
    }
};

/**
 * Import items from a JSON string
 * @param {string} jsonData
 * @returns {Promise<Object>}
 */
export const importItemsFromJSON = async (jsonData) => {
    try {
        const importedItems = JSON.parse(jsonData);

        if (!Array.isArray(importedItems)) {
            throw new Error('Invalid JSON format: Expected an array of items');
        }

        for (let i = 0; i < importedItems.length; i++) {
            const item = importedItems[i];
            if (!item.name || typeof item.name !== 'string') {
                throw new Error(`Invalid item at index ${i}: Missing or invalid 'name' field`);
            }
            if (item.defaultPrice === undefined || typeof item.defaultPrice !== 'number') {
                throw new Error(`Invalid item at index ${i}: Missing or invalid 'defaultPrice' field`);
            }
        }

        let importedCount = 0;
        await db.transaction('rw', db.items, async () => {
            const existingItems = await db.items.toArray();

            for (const importedItem of importedItems) {
                const cleanItemData = { ...importedItem };
                delete cleanItemData.id;
                delete cleanItemData.createdAt;
                delete cleanItemData.updatedAt;

                const match = existingItems.find(
                    e => e.name.toLowerCase().trim() === cleanItemData.name.toLowerCase().trim()
                );

                if (match) {
                    await db.items.put({
                        ...match,
                        ...cleanItemData,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    await db.items.put({
                        ...cleanItemData,
                        id: Date.now() + importedCount,
                        createdAt: new Date().toISOString()
                    });
                }
                importedCount++;
            }
        });

        await loadItemsFromDb();
        return {
            success: true,
            count: importedCount
        };
    } catch (error) {
        console.error('Error importing items:', error);
        throw error;
    }
};
