/**
 * Validates an Indian Goods and Services Tax Identification Number (GSTIN).
 * Format: 2 state digits + 5 PAN letters + 4 PAN numbers + 1 PAN letter + 1 entity code + Z + 1 checksum
 * Example: 22AAAAA0000A1Z5
 */
export const validateGST = (gstNumber: string | null | undefined): boolean => {
    if (!gstNumber) return false;
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstNumber.trim().toUpperCase());
};

/**
 * Basic email format validation (RFC-5322 compatible pattern).
 */
export const validateEmail = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
};

/**
 * Basic phone number format validation (7 to 15 digits).
 */
export const validatePhone = (phone: string | number | null | undefined): boolean => {
    if (!phone) return false;
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
};
