/**
 * Template Constants
 * Centralizes template identifiers, template names, and template configurations.
 *
 * Design Note:
 * - `BUILT_IN_TEMPLATE_NAMES`: Primary indexed identifier in the Dexie schema ('++id, name, ...').
 *   Used for indexed O(log N) lookup and user-facing display.
 * - `BUILT_IN_TEMPLATE_KEYS`: Programmatic slug used for JSON serialization, tokens, and imports.
 *   Stored as a non-indexed metadata attribute on template objects.
 */

export const BUILT_IN_TEMPLATE_NAMES = Object.freeze({
    CLASSIC: 'Classic',
    MODERN: 'Modern',
    MINIMAL: 'Minimal',
});

export const BUILT_IN_TEMPLATE_KEYS = Object.freeze({
    CLASSIC: 'classic',
    MODERN: 'modern',
    MINIMAL: 'minimal',
});

export const DEFAULT_BUILT_IN_TEMPLATE_NAME = BUILT_IN_TEMPLATE_NAMES.CLASSIC;

export const TEMPLATE_SCHEMA = '++id, name, isDefault, isBuiltIn, updatedAt';

export const MAX_TEMPLATE_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
