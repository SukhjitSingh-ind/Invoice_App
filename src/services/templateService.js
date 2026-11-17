/**
 * Template Service
 * Handles persistence, idempotent seeding, and lifecycle operations for invoice templates in Dexie IndexedDB.
 */

import { db } from '../db/db.js';
import {
    STORAGE_KEYS,
    DEFAULT_BUILT_IN_TEMPLATE_NAME,
    DEXIE_TRANSACTION_MODE
} from '../constants/index.js';
import { BUILT_IN_TEMPLATES } from '../templates/builtInTemplates.js';

const activeSeedPromises = new WeakMap();

/**
 * Idempotently seeds built-in templates into IndexedDB during application startup.
 *
 * Rules:
 * - Checks which built-in templates already exist by stable identifier (`name` / `key`).
 * - Inserts only missing templates within an atomic Dexie read-write transaction.
 * - Does not overwrite or recreate existing built-in or customized templates.
 * - Leaves user-created templates untouched.
 * - Ensures `selectedTemplateId` in app settings is populated with a valid template ID.
 *
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<{ seededCount: number, existingCount: number, defaultTemplateId: number | null }>}
 */
export async function seedBuiltInTemplates(dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }

    if (activeSeedPromises.has(dbInstance)) {
        return await activeSeedPromises.get(dbInstance);
    }

    const seedPromise = (async () => {
        let seededCount = 0;
        let existingCount = 0;
        let defaultTemplateId = null;

        await dbInstance.transaction(
            DEXIE_TRANSACTION_MODE.READ_WRITE,
            [dbInstance.templates, dbInstance.settings],
            async () => {
                for (const def of BUILT_IN_TEMPLATES) {
                    const existingByName = await dbInstance.templates.where('name').equals(def.name).first();
                    const existingByKey = !existingByName && def.key
                        ? await dbInstance.templates.filter(t => t.key === def.key).first()
                        : null;

                    const existing = existingByName || existingByKey;

                    if (existing) {
                        existingCount++;
                    } else {
                        await dbInstance.templates.add({
                            name: def.name,
                            key: def.key,
                            isDefault: Boolean(def.isDefault),
                            isBuiltIn: true,
                            html: def.html,
                            css: def.css,
                            updatedAt: new Date()
                        });
                        seededCount++;
                    }
                }

                const defaultTemplate = await getDefaultTemplate(dbInstance);
                defaultTemplateId = defaultTemplate?.id || null;

                try {
                    let configRecord = await dbInstance.settings.get(STORAGE_KEYS.APP_CONFIG);
                    if (!configRecord) {
                        configRecord = {
                            key: STORAGE_KEYS.APP_CONFIG,
                            value: {
                                selectedTemplateId: defaultTemplateId
                            }
                        };
                        await dbInstance.settings.put(configRecord);
                    } else if (configRecord.value) {
                        const validId = await resolveValidTemplateId(configRecord.value.selectedTemplateId, dbInstance);
                        if (configRecord.value.selectedTemplateId !== validId) {
                            configRecord.value.selectedTemplateId = validId;
                            await dbInstance.settings.put(configRecord);
                        }
                    }
                } catch (err) {
                    console.warn('Could not synchronize selectedTemplateId in settings during template seeding:', err);
                }
            }
        );

        return {
            seededCount,
            existingCount,
            defaultTemplateId
        };
    })();

    activeSeedPromises.set(dbInstance, seedPromise);
    try {
        return await seedPromise;
    } finally {
        activeSeedPromises.delete(dbInstance);
    }
}

/**
 * Resolves a valid template ID given a candidate ID.
 * Returns candidateId if it exists in the templates store,
 * otherwise falls back to the ID of getDefaultTemplate(dbInstance).
 *
 * @param {number|string|null} candidateId
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<number|string|null>}
 */
export async function resolveValidTemplateId(candidateId, dbInstance = db) {
    if (!dbInstance || !dbInstance.templates) {
        return null;
    }
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }

    if (candidateId != null) {
        try {
            const numId = typeof candidateId === 'string' && /^\d+$/.test(candidateId)
                ? Number(candidateId)
                : candidateId;
            const target = await dbInstance.templates.get(numId);
            if (target) {
                return target.id;
            }
        } catch {
            // Fall through to default template
        }
    }

    const defaultTpl = await getDefaultTemplate(dbInstance);
    return defaultTpl?.id || null;
}

/**
 * Retrieves all templates stored in Dexie.
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<Array<object>>}
 */
export async function getAllTemplatesAsync(dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }
    return await dbInstance.templates.toArray();
}

/**
 * Retrieves a single template by its ID.
 * @param {number|string} id
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<object|null>}
 */
export async function getTemplateByIdAsync(id, dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }
    if (id == null) return null;

    const numId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
    const found = await dbInstance.templates.get(numId);
    return found || null;
}

/**
 * Retrieves the default invoice template following deterministic priority:
 * 1. Template explicitly marked as default (isDefault = true)
 * 2. Template named 'Classic' (DEFAULT_BUILT_IN_TEMPLATE_NAME)
 * 3. First available template in the store
 * 4. null if the store is empty
 *
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<object|null>}
 */
export async function getDefaultTemplate(dbInstance = db) {
    if (!dbInstance || !dbInstance.templates) {
        return null;
    }
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }

    try {
        const byDefault = await dbInstance.templates.filter(t => Boolean(t.isDefault)).first();
        if (byDefault) return byDefault;

        const byName = await dbInstance.templates.where('name').equals(DEFAULT_BUILT_IN_TEMPLATE_NAME).first();
        if (byName) return byName;

        const firstAvailable = await dbInstance.templates.toCollection().first();
        return firstAvailable || null;
    } catch {
        return null;
    }
}

/**
 * Creates or updates a template in Dexie.
 * @param {object} template
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<number|string>} Returns the template ID
 */
export async function saveTemplateAsync(template, dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }

    const record = {
        ...template,
        updatedAt: new Date()
    };

    if (record.id) {
        await dbInstance.templates.put(record);
        return record.id;
    } else {
        return await dbInstance.templates.add(record);
    }
}

/**
 * Deletes a template from Dexie by ID.
 * @param {number|string} id
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<boolean>}
 */
export async function deleteTemplateAsync(id, dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }
    const numId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
    await dbInstance.templates.delete(numId);
    return true;
}
