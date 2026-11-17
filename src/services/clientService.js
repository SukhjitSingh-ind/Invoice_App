import { db } from '../db/db.js';
import { MIME_TYPES } from '../constants/index.js';

let cachedClients = [];

/**
 * Hydrates clients cache from Dexie.
 * @returns {Promise<Array>}
 */
export const loadClientsFromDb = async () => {
    try {
        const clients = await db.clients.toArray();
        cachedClients = clients;
        return clients;
    } catch (error) {
        console.error('Error loading clients from Dexie:', error);
        return cachedClients;
    }
};

/**
 * Get all clients (sync from cache, fallback empty)
 * @returns {Array} Array of client objects
 */
export const getAllClients = () => {
    return cachedClients;
};

/**
 * Get all clients asynchronously directly from Dexie
 * @returns {Promise<Array>}
 */
export const getAllClientsAsync = async () => {
    return await loadClientsFromDb();
};

/**
 * Get single client by ID
 * @param {number|string} id - Client ID
 * @returns {Promise<Object|null>} Client object or null if not found
 */
export const getClient = async (id) => {
    if (id === null || id === undefined) return null;
    let client = await db.clients.get(id);
    if (!client && typeof id === 'string') {
        const numId = Number(id);
        if (!isNaN(numId)) client = await db.clients.get(numId);
    }
    if (!client) {
        client = await db.clients.filter(c => String(c.id) === String(id)).first();
    }
    return client || null;
};

/**
 * Create a new client
 * @param {Object} clientData
 * @returns {Promise<Object>}
 */
export const createClient = async (clientData) => {
    const newClient = {
        id: Date.now(),
        ...clientData,
        createdAt: new Date().toISOString()
    };
    await db.clients.put(newClient);
    await loadClientsFromDb();
    return newClient;
};

/**
 * Update an existing client by ID
 * @param {number|string} id
 * @param {Object} clientData
 * @returns {Promise<Object|null>}
 */
export const updateClient = async (id, clientData) => {
    const existing = await getClient(id);
    if (!existing) return null;

    const updated = {
        ...existing,
        ...clientData,
        id: existing.id,
        updatedAt: new Date().toISOString()
    };
    await db.clients.put(updated);
    await loadClientsFromDb();
    return updated;
};

/**
 * Update or Insert a client based on Name match
 * @param {Object} clientData
 * @returns {Promise<Object>}
 */
export const upsertClient = async (clientData) => {
    const searchName = (clientData.name || '').trim().toLowerCase();
    if (!searchName) return null;

    const existingClient = await db.clients
        .filter(c => (c.name || '').trim().toLowerCase() === searchName)
        .first();

    if (existingClient) {
        const updatedData = { ...clientData };
        if (!updatedData.mobile && existingClient.mobile) updatedData.mobile = existingClient.mobile;
        if (!updatedData.email && existingClient.email) updatedData.email = existingClient.email;
        if (!updatedData.gstNumber && existingClient.gstNumber) updatedData.gstNumber = existingClient.gstNumber;
        if (!updatedData.address && existingClient.address) updatedData.address = existingClient.address;

        return await updateClient(existingClient.id, updatedData);
    } else {
        return await createClient(clientData);
    }
};

/**
 * Save client (create or update)
 * @param {Object} client
 * @returns {Promise<Object>}
 */
export const saveClient = async (client) => {
    if (client.id) {
        return await updateClient(client.id, client);
    }
    return await createClient(client);
};

/**
 * Delete client by ID
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
export const deleteClient = async (id) => {
    try {
        const existing = await getClient(id);
        const targetId = existing ? existing.id : id;
        await db.clients.delete(targetId);
        await loadClientsFromDb();
        return true;
    } catch (error) {
        console.error('Error deleting client:', error);
        return false;
    }
};

/**
 * Create empty client object
 * @returns {Object}
 */
export const createEmptyClient = () => {
    return {
        name: '',
        mobile: '',
        email: '',
        gstNumber: '',
        address: ''
    };
};

/**
 * Export all clients to a downloadable JSON file
 * @returns {Promise<void>}
 */
export const exportClientsToJSON = async () => {
    try {
        const clients = await db.clients.toArray();
        const jsonString = JSON.stringify(clients, null, 2);
        const blob = new Blob([jsonString], { type: MIME_TYPES.JSON });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `clients_backup_${timestamp}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting clients:', error);
        throw new Error('Failed to export clients');
    }
};

/**
 * Import clients from a JSON string
 * @param {string} jsonData
 * @returns {Promise<Object>}
 */
export const importClientsFromJSON = async (jsonData) => {
    try {
        const importedClients = JSON.parse(jsonData);

        if (!Array.isArray(importedClients)) {
            throw new Error('Invalid JSON format: Expected an array of clients');
        }

        for (let i = 0; i < importedClients.length; i++) {
            const client = importedClients[i];
            if (!client.name || typeof client.name !== 'string') {
                throw new Error(`Invalid client at index ${i}: Missing or invalid 'name' field`);
            }
        }

        let importedCount = 0;
        for (const clientData of importedClients) {
            const cleanClientData = { ...clientData };
            delete cleanClientData.id;
            delete cleanClientData.createdAt;
            delete cleanClientData.updatedAt;
            await upsertClient(cleanClientData);
            importedCount++;
        }

        await loadClientsFromDb();
        return {
            success: true,
            count: importedCount
        };
    } catch (error) {
        console.error('Error importing clients:', error);
        throw error;
    }
};
