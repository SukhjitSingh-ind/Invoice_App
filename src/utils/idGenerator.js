/**
 * Generates a collision-resistant unique identifier for invoices.
 * Uses crypto.randomUUID() where available, with a cryptographically secure
 * RFC 4122 v4 fallback for older browsers or restricted environments.
 *
 * @returns {string} Unique UUID
 */
export function generateUniqueInvoiceId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    // High-entropy fallback if crypto is completely unavailable
    const perf = (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? Math.floor(performance.now() * 1000).toString(16)
        : '';
    const rand1 = Math.random().toString(16).substring(2, 10);
    const rand2 = Math.random().toString(16).substring(2, 10);
    return `inv-${Date.now().toString(16)}-${perf}-${rand1}${rand2}`;
}
