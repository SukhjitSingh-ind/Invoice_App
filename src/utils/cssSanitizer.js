/**
 * CSS Sanitizer Utility
 *
 * Implements an AST-based CSS sanitization engine powered by `css-tree`.
 * Enforces an explicit, comprehensive CSS security policy:
 * - Parses stylesheets and inline style declarations into an AST rather than relying on regex.
 * - Decodes CSS escape sequences and normalizes identifiers to prevent obfuscation bypasses.
 * - Restricts at-rules to a safe allowlist (@media, @page, @supports, @keyframes).
 * - Forbids @import, @charset, @namespace, and unsafe at-rules.
 * - Forbids legacy dangerous properties (behavior, -ms-behavior, -moz-binding) and CSS expressions.
 * - Validates url() references against a strict URL policy (blocking javascript:, vbscript:,
 *   dangerous data URIs, local/remote file schemes, and control character tricks).
 * - Sanitizes both <style> block stylesheets and inline `style` attributes.
 * - Fails safely (fail-closed) on malformed, unparseable, or truncated CSS.
 */

import * as csstree from 'css-tree';

/* =========================================================================
   SECURITY POLICY CONSTANTS & CONFIGURATION
   ========================================================================= */

/**
 * Module-private set of safe CSS at-rules permitted in invoice templates.
 * All other at-rules (e.g. @import, @charset, @namespace, @font-face, @document, @scope) are rejected.
 */
const ALLOWED_AT_RULES_SET = new Set([
    'media',
    'page',
    'supports',
    'keyframes',
    '-webkit-keyframes'
]);

/**
 * Module-private set of dangerous CSS properties that permit external script or binary code execution in legacy or modern browsers.
 */
const FORBIDDEN_PROPERTIES_SET = new Set([
    'behavior',
    '-ms-behavior',
    '-moz-binding'
]);

/**
 * Read-only list of safe CSS at-rules permitted in invoice templates.
 * Deeply immutable: Object.freeze() on an Array prevents adding, removing, or modifying entries.
 */
export const ALLOWED_AT_RULES = Object.freeze([
    'media',
    'page',
    'supports',
    'keyframes',
    '-webkit-keyframes'
]);

/**
 * Read-only list of dangerous CSS properties that permit external script or binary code execution in browsers.
 * Deeply immutable: Object.freeze() on an Array prevents adding, removing, or modifying entries.
 */
export const FORBIDDEN_PROPERTIES = Object.freeze([
    'behavior',
    '-ms-behavior',
    '-moz-binding'
]);

/**
 * Determines whether a CSS at-rule is permitted under the security policy.
 * Safely accepts at-rule names with or without leading '@'.
 *
 * @param {string} atRuleName - The CSS at-rule identifier (e.g. 'media' or '@media')
 * @returns {boolean} True if the at-rule is allowed
 */
export function isAllowedAtRule(atRuleName) {
    if (!atRuleName || typeof atRuleName !== 'string') return false;
    const normalized = atRuleName.startsWith('@') ? atRuleName.slice(1).toLowerCase() : atRuleName.toLowerCase();
    return ALLOWED_AT_RULES_SET.has(normalized);
}

/**
 * Determines whether a CSS property name is forbidden under the security policy.
 *
 * @param {string} propName - The CSS property name (e.g. 'behavior')
 * @returns {boolean} True if the property is forbidden
 */
export function isForbiddenProperty(propName) {
    if (!propName || typeof propName !== 'string') return false;
    return FORBIDDEN_PROPERTIES_SET.has(propName.toLowerCase());
}

/**
 * Strict regex for safe raster image data URIs (PNG, JPEG, GIF, WEBP) base64-encoded only.
 * Disallows SVG (which can contain embedded JavaScript) and text/html data URIs.
 */
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

/**
 * Strips ASCII control characters (0-31, 127) and whitespace characters from a string without regex control characters.
 *
 * @param {string} str
 * @returns {string}
 */
export function stripControlAndWhitespace(str) {
    if (!str || typeof str !== 'string') return '';
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code > 32 && code !== 127) {
            result += str[i];
        }
    }
    return result;
}

/**
 * Checks whether a string contains ASCII control characters or forbidden HTML/CSS delimiters.
 *
 * @param {string} str
 * @returns {boolean} True if forbidden characters are present
 */
export function hasForbiddenUrlChars(str) {
    if (!str || typeof str !== 'string') return true;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 32 || code === 127) {
            return true;
        }
        const ch = str[i];
        if (ch === '{' || ch === '}' || ch === '<' || ch === '>' ||
            ch === '"' || ch === "'" || ch === '\\' || ch === '`') {
            return true;
        }
    }
    return false;
}

/**
 * Decodes all CSS escape sequences in a string (e.g. `\6a avascript` -> `javascript`).
 * Handles hex escapes (`\Hex{1,6}\s?`) and generic character escapes (`\c`).
 *
 * @param {string} str
 * @returns {string}
 */
export function decodeCssEscapes(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/\\(?:([0-9a-fA-F]{1,6})\s?|([\s\S]))/g, (match, hex, char) => {
        if (hex) {
            const code = parseInt(hex, 16);
            if (code === 0 || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff) {
                return '\ufffd';
            }
            return String.fromCodePoint(code);
        }
        return char || '';
    });
}

/**
 * Validates a URL reference against the CSS security policy.
 *
 * Rules:
 * - Strips leading/trailing whitespace and ASCII control characters.
 * - Rejects URLs containing forbidden control characters or HTML/CSS delimiter characters.
 * - Disallows dangerous protocols: `javascript:`, `vbscript:`, `file:`, `blob:`, `about:`.
 * - Permits safe data URIs exclusively for raster images (PNG, JPEG, GIF, WEBP) base64 encoded.
 * - Permits `http:` and `https:` URLs if `allowExternalUrls` is true.
 * - Permits local relative paths and fragment anchors (e.g. `/assets/logo.png`, `#clip`).
 *
 * @param {string} rawUrl
 * @param {object} [options={}]
 * @param {boolean} [options.allowExternalUrls=false]
 * @returns {boolean} True if the URL satisfies the safety policy
 */
export function isSafeUrl(rawUrl, options = {}) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;

    const { allowExternalUrls = false } = options;

    // Decode any CSS escape sequences in the URL string
    const unescaped = decodeCssEscapes(rawUrl);

    // Reject URLs containing null bytes or non-whitespace ASCII control characters
    for (let i = 0; i < unescaped.length; i++) {
        const code = unescaped.charCodeAt(i);
        if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) {
            return false;
        }
    }

    // Strip surrounding whitespace and ASCII control characters (0x00-0x1F, 0x7F)
    const cleanUrl = stripControlAndWhitespace(unescaped);
    if (!cleanUrl) return false;

    // Disallow HTML delimiters, brackets, quotes, backslashes, or control characters in URLs
    if (hasForbiddenUrlChars(cleanUrl)) {
        return false;
    }

    // Check for protocol-relative URLs (e.g. "//evil.example/tracker.png")
    // Protocol-relative URLs resolve to external hosts using the current page's protocol.
    // They must be treated as external URLs and respect the allowExternalUrls policy.
    if (cleanUrl.startsWith('//')) {
        return Boolean(allowExternalUrls);
    }

    // Identify URL scheme
    const schemeMatch = cleanUrl.match(/^([a-z0-9+.-]+):/i);
    if (!schemeMatch) {
        // Relative URL or fragment (e.g. /images/logo.png, images/logo.png, ../images/logo.png, #anchor)
        // Guard against scheme tricks with embedded whitespace (e.g. "java script:")
        if (/^[a-z0-9+.-]+[\s]*:/i.test(unescaped)) {
            return false;
        }
        return true;
    }

    const scheme = schemeMatch[1].toLowerCase();

    // Immediately reject known dangerous execution schemes
    if (scheme === 'javascript' || scheme === 'vbscript' || scheme === 'file' || scheme === 'blob' || scheme === 'about') {
        return false;
    }

    // Safe data URIs (raster images only)
    if (scheme === 'data') {
        return SAFE_DATA_IMAGE_REGEX.test(cleanUrl);
    }

    // HTTP / HTTPS URLs
    if (scheme === 'http' || scheme === 'https') {
        return Boolean(allowExternalUrls);
    }

    // Reject all other unknown schemes
    return false;
}

/**
 * Determines whether a CSS AST declaration node is unsafe or malformed.
 *
 * Checks:
 * - Decoded property name against forbidden properties (behavior, -moz-binding).
 * - Property name for `expression`.
 * - Empty or missing declaration values.
 * - Function calls for `expression(...)`.
 * - `url()` values against `isSafeUrl`.
 * - String literals for dangerous schemes (e.g. inside `image-set(...)`).
 * - Raw unparseable tokens for suspicious or dangerous patterns.
 *
 * @param {import('css-tree').Declaration} node
 * @param {object} [options={}]
 * @returns {boolean} True if the declaration contains unsafe or invalid constructs
 */
function isDangerousDeclaration(node, options = {}) {
    if (!node || node.type !== 'Declaration') return false;

    // Normalize property name
    const propName = csstree.ident.decode(node.property).toLowerCase();
    if (isForbiddenProperty(propName) || propName.includes('expression')) {
        return true;
    }

    // Reject declarations with empty or missing values
    if (!node.value || !node.value.children || node.value.children.isEmpty) {
        return true;
    }

    let isDangerous = false;

    csstree.walk(node.value, (child) => {
        if (isDangerous) return;

        // Check CSS functions (e.g. expression())
        if (child.type === 'Function') {
            const funcName = csstree.ident.decode(child.name).toLowerCase();
            if (funcName === 'expression') {
                isDangerous = true;
                return;
            }
        }

        // Check Url AST nodes
        if (child.type === 'Url') {
            const urlValue = child.value;
            if (!isSafeUrl(urlValue, options)) {
                isDangerous = true;
                return;
            }
        }

        // Check String literals (e.g. inside image-set or similar)
        if (child.type === 'String') {
            const strValue = child.value;
            const stripped = stripControlAndWhitespace(decodeCssEscapes(strValue)).toLowerCase();
            if (stripped.startsWith('javascript:') || stripped.startsWith('vbscript:')) {
                isDangerous = true;
                return;
            }
        }

        // Check Raw AST nodes (unparseable tokens or browser hacks)
        if (child.type === 'Raw') {
            const rawValue = child.value;
            const decodedRaw = decodeCssEscapes(rawValue);
            const normalizedRaw = stripControlAndWhitespace(decodedRaw).toLowerCase();

            if (
                normalizedRaw.includes('expression(') ||
                normalizedRaw.includes('javascript:') ||
                normalizedRaw.includes('vbscript:') ||
                normalizedRaw.includes('behavior:') ||
                normalizedRaw.includes('-moz-binding:') ||
                normalizedRaw.includes('@import')
            ) {
                isDangerous = true;
                return;
            }

            // If raw contains url(...), validate each url
            const urlMatches = decodedRaw.match(/url\s*\(([^)]*)\)/gi);
            if (urlMatches) {
                for (const m of urlMatches) {
                    const innerUrl = m.replace(/^url\s*\(\s*['"]?|['"]?\s*\)$/gi, '');
                    if (!isSafeUrl(innerUrl, options)) {
                        isDangerous = true;
                        return;
                    }
                }
            }
        }
    });

    return isDangerous;
}

/**
 * Sanitizes an inline CSS declaration list AST in-place.
 *
 * @param {import('css-tree').DeclarationList} ast
 * @param {object} [options={}]
 */
function sanitizeDeclarationListAst(ast, options = {}) {
    csstree.walk(ast, {
        enter(node, item, list) {
            // Remove unparseable Raw tokens at the declaration list level
            if (node.type === 'Raw' && list && item) {
                list.remove(item);
                return;
            }

            // Remove dangerous or malformed declarations
            if (node.type === 'Declaration') {
                if (isDangerousDeclaration(node, options)) {
                    if (list && item) list.remove(item);
                }
            }
        }
    });
}

/**
 * Sanitizes a stylesheet AST in-place.
 *
 * @param {import('css-tree').StyleSheet} ast
 * @param {object} [options={}]
 */
function sanitizeStyleSheetAst(ast, options = {}) {
    // Pass 1: Remove unparseable Raw nodes, forbidden At-rules, and dangerous Declarations
    csstree.walk(ast, {
        enter(node, item, list) {
            if (node.type === 'Raw' && list && item) {
                list.remove(item);
                return;
            }

            if (node.type === 'Atrule') {
                const atRuleName = csstree.ident.decode(node.name).toLowerCase();
                if (!isAllowedAtRule(atRuleName)) {
                    if (list && item) list.remove(item);
                    return;
                }
            }

            if (node.type === 'Declaration') {
                if (isDangerousDeclaration(node, options)) {
                    if (list && item) list.remove(item);
                }
            }
        }
    });

    // Pass 2: Clean up empty rules and empty at-rules (e.g. rules whose declarations were all removed)
    csstree.walk(ast, {
        enter(node, item, list) {
            if (node.type === 'Rule') {
                if (node.block && node.block.children.isEmpty) {
                    if (list && item) list.remove(item);
                }
            } else if (node.type === 'Atrule') {
                if (node.block && node.block.children.isEmpty) {
                    if (list && item) list.remove(item);
                }
            }
        }
    });

    // Pass 3: Secondary check for at-rules containing only rules that became empty
    csstree.walk(ast, {
        enter(node, item, list) {
            if (node.type === 'Atrule') {
                if (node.block && node.block.children.isEmpty) {
                    if (list && item) list.remove(item);
                }
            }
        }
    });
}

/**
 * Sanitizes a CSS stylesheet string (intended for `<style>` blocks).
 *
 * @param {string} cssText - Raw CSS stylesheet string
 * @param {object} [options={}] - Sanitizer options
 * @param {boolean} [options.allowExternalUrls=false] - Whether to allow http:/https: URLs
 * @returns {string} Sanitized CSS string, or empty string if unsafe/malformed
 */
export function sanitizeCss(cssText, options = {}) {
    if (!cssText || typeof cssText !== 'string' || !cssText.trim()) {
        return '';
    }

    try {
        const ast = csstree.parse(cssText, {
            context: 'stylesheet',
            parseCustomProperty: true
        });

        sanitizeStyleSheetAst(ast, { allowExternalUrls: false, ...options });

        if (!ast.children || ast.children.isEmpty) {
            return '';
        }

        return csstree.generate(ast);
    } catch {
        // Safe failover: malformed or unparseable CSS fails closed to empty string
        return '';
    }
}

/**
 * Sanitizes an inline style string (intended for `style="..."` HTML attributes).
 *
 * @param {string} styleText - Raw inline style declaration list
 * @param {object} [options={}] - Sanitizer options
 * @param {boolean} [options.allowExternalUrls=false] - Whether to allow http:/https: URLs
 * @returns {string} Sanitized CSS declaration list string, or empty string if unsafe/malformed
 */
export function sanitizeInlineStyle(styleText, options = {}) {
    if (!styleText || typeof styleText !== 'string' || !styleText.trim()) {
        return '';
    }

    try {
        const ast = csstree.parse(styleText, {
            context: 'declarationList',
            parseCustomProperty: true
        });

        sanitizeDeclarationListAst(ast, { allowExternalUrls: false, ...options });

        if (!ast.children || ast.children.isEmpty) {
            return '';
        }

        return csstree.generate(ast);
    } catch {
        // Safe failover: malformed or unparseable inline styles fail closed
        return '';
    }
}
