const STORAGE_KEY = 'invoice_app_clients';

/**
 * Get all clients from localStorage
 * @returns {Array} Array of client objects
 */
export const getAllClients = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading clients:', error);
        return [];
    }
};

/**
 * Save all clients to localStorage
 * @param {Array} clients - Array of client objects
 */
const saveClients = (clients) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch (error) {
        console.error('Error saving clients:', error);
    }
};

/**
 * Get single client by ID
 * @param {number|string} id - Client ID
 * @returns {Object|null} Client object or null if not found
 */
export const getClient = (id) => {
    const clients = getAllClients();
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return clients.find(client => client.id === numId) || null;
};

/**
 * Create a new client
 * @param {Object} clientData - Client data for the new client
 * @returns {Object} The newly created client object
 */
export const createClient = (clientData) => {
    const clients = getAllClients();
    const newClient = {
        id: Date.now(),
        ...clientData,
        createdAt: new Date().toISOString()
    };
    clients.push(newClient);
    saveClients(clients);
    return newClient;
};

/**
 * Update an existing client by ID
 * @param {number|string} id - The ID of the client to update
 * @param {Object} clientData - The data to update the client with
 * @returns {Object|null} The updated client object, or null if not found
 */
export const updateClient = (id, clientData) => {
    const clients = getAllClients();
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) {
        clients[index] = {
            ...clients[index],
            ...clientData,
            id, // Preserve the original ID
            updatedAt: new Date().toISOString()
        };
        saveClients(clients);
        return clients[index];
    }
    return null;
};

/**
 * Update or Insert a client based on Name match
 * @param {Object} clientData - Client data to save
 * @returns {Object} The saved client object
 */
export const upsertClient = (clientData) => {
    const clients = getAllClients();
    // Normalize name for comparison
    const searchName = (clientData.name || '').trim().toLowerCase();

    // Find existing client by name
    const existingClient = clients.find(c => (c.name || '').trim().toLowerCase() === searchName);

    if (existingClient) {
        // Update existing, but preserve fields if new data is empty
        const updatedData = { ...clientData };
        if (!updatedData.mobile && existingClient.mobile) updatedData.mobile = existingClient.mobile;
        if (!updatedData.email && existingClient.email) updatedData.email = existingClient.email;
        if (!updatedData.gstNumber && existingClient.gstNumber) updatedData.gstNumber = existingClient.gstNumber;
        if (!updatedData.address && existingClient.address) updatedData.address = existingClient.address;

        return updateClient(existingClient.id, updatedData);
    } else {
        // Create new
        return createClient(clientData);
    }
};

/**
 * Save client (create or update)
 * @param {Object} client - Client object
 * @returns {Object} Saved client object
 */
export const saveClient = (client) => {
    if (client.id) {
        return updateClient(client.id, client);
    }
    return createClient(client);
};

/**
 * Delete client by ID
 * @param {number|string} id - Client ID
 * @returns {boolean} Success status
 */
export const deleteClient = (id) => {
    try {
        let clients = getAllClients();
        clients = clients.filter(client => String(client.id) !== String(id));
        saveClients(clients);
        return true;
    } catch (error) {
        console.error('Error deleting client:', error);
        return false;
    }
};

/**
 * Create empty client object
 * @returns {Object} Empty client object with default values
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
 * @returns {void}
 */
export const exportClientsToJSON = () => {
    try {
        const clients = getAllClients();
        const jsonString = JSON.stringify(clients, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
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
 * @param {string} jsonData - JSON string containing client data
 * @returns {Object} Object with success status and count of imported clients
 * @throws {Error} If JSON is invalid or has incorrect structure
 */
export const importClientsFromJSON = (jsonData) => {
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
        importedClients.forEach(clientData => {
            const cleanClientData = { ...clientData };
            delete cleanClientData.id;
            delete cleanClientData.createdAt;
            delete cleanClientData.updatedAt;
            upsertClient(cleanClientData);
            importedCount++;
        });

        return {
            success: true,
            count: importedCount
        };
    } catch (error) {
        console.error('Error importing clients:', error);
        throw error;
    }
};
