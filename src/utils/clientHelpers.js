// Client avatar color palettes aligned with modern SaaS B2B styling
export const AVATAR_COLOR_PALETTES = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-slate-100 text-slate-700 border-slate-300',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-amber-100 text-amber-800 border-amber-200',
];

export const CLIENTS_PER_PAGE = 12;

/**
 * Deterministically derives an avatar color palette based on client name and ID
 */
export const getClientAvatarStyle = (name = '', id = 0) => {
    let hash = 0;
    const key = `${name}_${id}`;
    for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
    return AVATAR_COLOR_PALETTES[index];
};

/**
 * Returns initials for a client name (e.g. "Acme Corp" -> "AC", "Stark" -> "ST")
 */
export const getInitials = (name = '') => {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'CL';
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Filters a client list dynamically by name, phone, email, GST, or address
 */
export const filterClients = (clients = [], searchQuery = '') => {
    const query = (searchQuery || '').trim().toLowerCase();
    if (!query) return clients;

    return clients.filter(client => {
        if (!client) return false;
        const nameMatch = (client.name || '').toLowerCase().includes(query);
        const mobileMatch = (client.mobile || '').includes(query);
        const emailMatch = (client.email || '').toLowerCase().includes(query);
        const gstMatch = (client.gstNumber || '').toLowerCase().includes(query);
        const addressMatch = (client.address || '').toLowerCase().includes(query);
        return nameMatch || mobileMatch || emailMatch || gstMatch || addressMatch;
    });
};

/**
 * Returns a paginated slice of clients and metadata
 */
export const paginateClients = (clients = [], page = 1, pageSize = CLIENTS_PER_PAGE) => {
    const totalItems = Array.isArray(clients) ? clients.length : 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const validPage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
    const startIndex = (validPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const items = (Array.isArray(clients) ? clients : []).slice(startIndex, endIndex);

    return {
        items,
        page: validPage,
        totalPages,
        totalItems,
        startIndex,
        endIndex,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
    };
};

/**
 * Returns array of page numbers and ellipsis strings for pagination UI
 */
export const getPageNumbers = (currentPage, totalPages) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
        return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};
