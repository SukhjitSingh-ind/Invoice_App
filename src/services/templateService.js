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
import { generateUniqueTemplateName } from '../utils/templateValidator.js';

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
                // Check if multiple defaults exist in the current store and reconcile
                const existingDefaults = await dbInstance.templates.filter(t => Boolean(t.isDefault)).toArray();
                if (existingDefaults.length > 1) {
                    const primaryDefault = existingDefaults.find(t => t.name === DEFAULT_BUILT_IN_TEMPLATE_NAME) || existingDefaults[0];
                    for (const extra of existingDefaults) {
                        if (extra.id !== primaryDefault.id) {
                            await dbInstance.templates.update(extra.id, { isDefault: false });
                        }
                    }
                }

                const hasExistingDefault = existingDefaults.length > 0;
                let defaultAssignedDuringSeeding = hasExistingDefault;

                for (const def of BUILT_IN_TEMPLATES) {
                    let existing = null;
                    if (def.key) {
                        existing = await dbInstance.templates.filter(t => t.key === def.key).first();
                    }

                    if (!existing) {
                        // Check for legacy record by name, but ONLY if it is not explicitly a user-created template
                        const legacyByName = await dbInstance.templates.where('name').equals(def.name).first();
                        if (legacyByName && legacyByName.isBuiltIn !== false) {
                            existing = legacyByName;
                        }
                    }

                    if (existing) {
                        existingCount++;
                        const updates = {};
                        if (!existing.key && def.key) {
                            updates.key = def.key;
                        }
                        if (existing.isBuiltIn !== true) {
                            updates.isBuiltIn = true;
                        }
                        if (Object.keys(updates).length > 0) {
                            await dbInstance.templates.update(existing.id, updates);
                        }
                    } else {
                        const shouldBeDefault = Boolean(def.isDefault) && !defaultAssignedDuringSeeding;
                        if (shouldBeDefault) {
                            defaultAssignedDuringSeeding = true;
                        }

                        await dbInstance.templates.add({
                            name: def.name,
                            key: def.key,
                            isDefault: shouldBeDefault,
                            isBuiltIn: true,
                            html: def.html,
                            css: def.css,
                            updatedAt: new Date()
                        });
                        seededCount++;
                    }
                }

                // If no template is marked default after insertion, assign Classic or first available
                const activeDefault = await dbInstance.templates.filter(t => Boolean(t.isDefault)).first();
                if (!activeDefault) {
                    const classic = await dbInstance.templates.where('name').equals(DEFAULT_BUILT_IN_TEMPLATE_NAME).first();
                    if (classic) {
                        await dbInstance.templates.update(classic.id, { isDefault: true, updatedAt: new Date() });
                    } else {
                        const first = await dbInstance.templates.toCollection().first();
                        if (first) {
                            await dbInstance.templates.update(first.id, { isDefault: true, updatedAt: new Date() });
                        }
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
            let target = await dbInstance.templates.get(numId);
            if (!target && typeof candidateId === 'string') {
                target = await dbInstance.templates.where('key').equals(candidateId).first();
            }
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
    let found = await dbInstance.templates.get(numId);
    if (!found && typeof id === 'string') {
        found = await dbInstance.templates.where('key').equals(id).first();
    }
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
 * Validates and sanitizes a template object before persistence.
 *
 * @param {object} template
 * @returns {object} Sanitized template object
 * @throws {TypeError|Error} If validation fails
 */
export function validateTemplate(template) {
    if (!template || typeof template !== 'object') {
        throw new TypeError('Template must be a non-null object');
    }
    const name = typeof template.name === 'string' ? template.name.trim() : '';
    if (!name) {
        throw new Error('Template name is required and must be a non-empty string');
    }
    if (typeof template.html !== 'string' || !template.html.trim()) {
        throw new Error('Template HTML is required and must be a non-empty string');
    }
    const css = typeof template.css === 'string' ? template.css : '';

    return {
        ...template,
        name,
        html: template.html,
        css,
        isDefault: Boolean(template.isDefault),
        isBuiltIn: Boolean(template.isBuiltIn)
    };
}

/**
 * Creates or updates a template in Dexie.
 * Enforces validation and default template uniqueness transactionally.
 *
 * @param {object} template
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<number|string>} Returns the template ID
 */
export async function saveTemplateAsync(template, dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }

    const validated = validateTemplate(template);
    const record = {
        ...validated,
        updatedAt: new Date()
    };

    return await dbInstance.transaction(
        DEXIE_TRANSACTION_MODE.READ_WRITE,
        [dbInstance.templates],
        async () => {
            const allTemplates = await dbInstance.templates.toArray();
            const normalizedName = record.name.trim().toLowerCase();
            const isDuplicate = allTemplates.some(t => {
                if (!t || typeof t.name !== 'string') return false;
                if (record.id != null && String(t.id) === String(record.id)) {
                    return false;
                }
                return t.name.trim().toLowerCase() === normalizedName;
            });

            if (isDuplicate) {
                throw new Error(`A template named "${record.name}" already exists. Please choose a unique name.`);
            }

            if (record.id) {
                const existing = await dbInstance.templates.get(record.id);
                if (existing && existing.isBuiltIn) {
                    throw new Error(`Built-in template "${existing.name}" is read-only and cannot be modified. Please duplicate the template to customize it.`);
                }
            }

            // Always enforce custom template status for user-managed saves
            record.isBuiltIn = false;

            if (record.isDefault) {
                await dbInstance.templates
                    .filter(t => Boolean(t.isDefault) && (!record.id || t.id !== record.id))
                    .modify({ isDefault: false });
            }

            if (record.id) {
                await dbInstance.templates.put(record);
                return record.id;
            } else {
                return await dbInstance.templates.add(record);
            }
        }
    );
}

/**
 * Duplicates any existing template (built-in or custom) and persists it as an independent custom template.
 *
 * Rules:
 * - Built-in templates remain completely read-only and untouched.
 * - The duplicated template is marked as isBuiltIn: false and isDefault: false.
 * - Generates a deterministic, unique duplicate name (e.g., "Classic (Copy)") avoiding collisions.
 * - Preserves complete HTML and CSS structure.
 * - Does not inherit built-in lookup keys to prevent slug collisions.
 *
 * @param {number|string} id - ID of the template to duplicate
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @param {object} [options={}]
 * @param {string} [options.newName] - Optional custom name for the duplicate
 * @returns {Promise<{ id: number, name: string, template: object }>}
 */
export async function duplicateTemplateAsync(id, dbInstance = db, options = {}) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }

    const source = await getTemplateByIdAsync(id, dbInstance);
    if (!source) {
        throw new Error(`Template with ID "${id}" not found`);
    }

    return await dbInstance.transaction(
        DEXIE_TRANSACTION_MODE.READ_WRITE,
        [dbInstance.templates],
        async () => {
            const allTemplates = await dbInstance.templates.toArray();
            const duplicateName = options.newName && options.newName.trim()
                ? options.newName.trim()
                : generateUniqueTemplateName(source.name, allTemplates);

            // Verify unique name
            const normalizedName = duplicateName.toLowerCase();
            const collision = allTemplates.some(t => t && t.name && t.name.trim().toLowerCase() === normalizedName);
            if (collision) {
                throw new Error(`A template named "${duplicateName}" already exists. Please choose a unique name.`);
            }

            const duplicatePayload = {
                name: duplicateName,
                html: source.html,
                css: source.css || '',
                isBuiltIn: false, // Critical: always false for duplicates
                isDefault: false, // Do not replace active default
                updatedAt: new Date()
            };

            const newId = await dbInstance.templates.add(duplicatePayload);
            const createdTemplate = { ...duplicatePayload, id: newId };

            return {
                id: newId,
                name: duplicateName,
                template: createdTemplate
            };
        }
    );
}

/**
 * Renames an existing custom template.
 * Built-in templates are read-only and cannot be renamed.
 *
 * @param {number|string} id
 * @param {string} newName
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<object>}
 */
export async function renameTemplateAsync(id, newName, dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }
    const numId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;

    return await dbInstance.transaction(
        DEXIE_TRANSACTION_MODE.READ_WRITE,
        [dbInstance.templates],
        async () => {
            const target = await dbInstance.templates.get(numId);
            if (!target) {
                throw new Error(`Template with ID "${id}" not found`);
            }
            if (target.isBuiltIn) {
                throw new Error(`Cannot rename built-in template "${target.name}". Built-in templates are read-only and cannot be renamed.`);
            }

            const trimmedName = typeof newName === 'string' ? newName.trim() : '';
            if (!trimmedName) {
                throw new Error('Template name cannot be empty or only whitespace.');
            }

            const allTemplates = await dbInstance.templates.toArray();
            const normalized = trimmedName.toLowerCase();
            const isDuplicate = allTemplates.some(t =>
                t && t.id !== numId && t.name && t.name.trim().toLowerCase() === normalized
            );

            if (isDuplicate) {
                throw new Error(`A template named "${trimmedName}" already exists. Please choose a unique name.`);
            }

            target.name = trimmedName;
            target.updatedAt = new Date();
            await dbInstance.templates.put(target);
            return target;
        }
    );
}

/**
 * Designates a template as the single default template transactionally.
 *
 * @param {number|string} id
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<boolean>}
 */
export async function setDefaultTemplateAsync(id, dbInstance = db) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }
    const numId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;

    return await dbInstance.transaction(
        DEXIE_TRANSACTION_MODE.READ_WRITE,
        [dbInstance.templates],
        async () => {
            const target = await dbInstance.templates.get(numId);
            if (!target) {
                throw new Error(`Template with ID ${id} not found`);
            }

            await dbInstance.templates
                .filter(t => Boolean(t.isDefault) && t.id !== numId)
                .modify({ isDefault: false });

            target.isDefault = true;
            target.updatedAt = new Date();
            await dbInstance.templates.put(target);

            return true;
        }
    );
}

/**
 * Deletes a template from Dexie by ID atomically.
 * If the deleted template was selected in settings or was marked as default,
 * updates settings and reassigns default within the same transaction.
 *
 * @param {number|string} id
 * @param {import('dexie').Dexie} [dbInstance=db]
 * @returns {Promise<boolean>}
 */
export async function deleteTemplateAsync(id, dbInstance = db, options = {}) {
    if (!dbInstance.isOpen()) {
        await dbInstance.open();
    }
    const numId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;

    const tables = [dbInstance.templates];
    if (dbInstance.settings) {
        tables.push(dbInstance.settings);
    }
    if (dbInstance.invoices) {
        tables.push(dbInstance.invoices);
    }

    return await dbInstance.transaction(
        DEXIE_TRANSACTION_MODE.READ_WRITE,
        tables,
        async () => {
            const templateToDelete = await dbInstance.templates.get(numId);
            if (!templateToDelete) {
                return false;
            }

            if (templateToDelete.isBuiltIn) {
                throw new Error(`Cannot delete built-in template "${templateToDelete.name}". Built-in templates are read-only.`);
            }

            // Check if existing invoices reference this template
            if (dbInstance.invoices) {
                const referencingInvoices = await dbInstance.invoices
                    .filter(inv => inv.template === numId || String(inv.template) === String(numId) || (templateToDelete.key && inv.template === templateToDelete.key))
                    .toArray();

                if (referencingInvoices.length > 0) {
                    if (options && options.reassignInvoicesTo) {
                        for (const inv of referencingInvoices) {
                            await dbInstance.invoices.update(inv.id, { template: options.reassignInvoicesTo });
                        }
                    } else {
                        throw new Error(`Cannot delete template "${templateToDelete.name}": it is currently referenced by ${referencingInvoices.length} invoice(s).`);
                    }
                }
            }

            const wasDefault = Boolean(templateToDelete.isDefault);
            await dbInstance.templates.delete(numId);

            if (wasDefault) {
                await dbInstance.templates.filter(t => Boolean(t.isDefault)).modify({ isDefault: false });

                const classic = await dbInstance.templates.where('name').equals(DEFAULT_BUILT_IN_TEMPLATE_NAME).first();
                if (classic) {
                    await dbInstance.templates.update(classic.id, { isDefault: true, updatedAt: new Date() });
                } else {
                    const firstRemaining = await dbInstance.templates.toCollection().first();
                    if (firstRemaining) {
                        await dbInstance.templates.update(firstRemaining.id, { isDefault: true, updatedAt: new Date() });
                    }
                }
            }

            if (dbInstance.settings) {
                try {
                    const configRecord = await dbInstance.settings.get(STORAGE_KEYS.APP_CONFIG);
                    if (configRecord && configRecord.value && (configRecord.value.selectedTemplateId === numId || String(configRecord.value.selectedTemplateId) === String(numId))) {
                        const fallbackTpl = await getDefaultTemplate(dbInstance);
                        configRecord.value.selectedTemplateId = fallbackTpl?.id || null;
                        await dbInstance.settings.put(configRecord);
                    }
                } catch {
                    // Non-critical settings cleanup
                }
            }
            return true;
        }
    );
}

export { renderInvoiceTemplate } from '../utils/templates.js';

