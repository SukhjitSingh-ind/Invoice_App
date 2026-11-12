/**
 * Validates a GST Number (GSTIN)
 * Format: 2 numbers + 5 letters + 4 numbers + 1 letter + 1 number/letter + Z + 1 number/letter
 * Example: 22AAAAA0000A1Z5
 * @param {string} gstNumber
 * @returns {boolean}
 */
export const validateGST = (gstNumber) => {
    if (!gstNumber) return false;
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstNumber.trim().toUpperCase());
};

/**
 * Basic email validation.
 * Allows most common local@domain patterns without being overly strict.
 */
export const validateEmail = (email) => {
    if (!email) return false;
    const trimmed = email.trim();
    // Simple RFC-5322-inspired pattern, good enough for UI validation
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(trimmed);
};

/**
 * Basic Indian/international phone validation.
 * - Digits only (optional leading +)
 * - Length between 7 and 15 digits (after removing non-digits)
 */
export const validatePhone = (phone) => {
    if (!phone) return false;
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
};

