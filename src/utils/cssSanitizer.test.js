import {
    sanitizeCss,
    sanitizeInlineStyle,
    isSafeUrl,
    decodeCssEscapes,
    ALLOWED_AT_RULES,
    FORBIDDEN_PROPERTIES,
    isAllowedAtRule,
    isForbiddenProperty
} from './cssSanitizer.js';

console.log('Running CSS Sanitizer & Security Policy Tests...');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        failed++;
    }
}

// =========================================================================
// 1. CONSTANTS, LOOKUP FUNCTIONS & IMMUTABILITY TESTS
// =========================================================================
console.log('\n--- 1. Testing Policy Constants, Lookup Functions & Immutability ---');

// Immutability of ALLOWED_AT_RULES
assert(Array.isArray(ALLOWED_AT_RULES), 'ALLOWED_AT_RULES is an Array');
assert(Object.isFrozen(ALLOWED_AT_RULES), 'ALLOWED_AT_RULES is deeply frozen with Object.freeze');
assert(ALLOWED_AT_RULES.includes('media'), 'ALLOWED_AT_RULES includes media');
assert(ALLOWED_AT_RULES.includes('page'), 'ALLOWED_AT_RULES includes page');
assert(ALLOWED_AT_RULES.includes('supports'), 'ALLOWED_AT_RULES includes supports');
assert(ALLOWED_AT_RULES.includes('keyframes'), 'ALLOWED_AT_RULES includes keyframes');
assert(ALLOWED_AT_RULES.includes('-webkit-keyframes'), 'ALLOWED_AT_RULES includes -webkit-keyframes');
assert(!ALLOWED_AT_RULES.includes('import'), 'ALLOWED_AT_RULES excludes import');
assert(!ALLOWED_AT_RULES.includes('font-face'), 'ALLOWED_AT_RULES excludes font-face');
assert(ALLOWED_AT_RULES.add === undefined, 'ALLOWED_AT_RULES does not expose mutable .add() method');

let atRulesPushMutated = false;
try {
    ALLOWED_AT_RULES.push('import');
    atRulesPushMutated = true;
} catch {
    atRulesPushMutated = false;
}
assert(!atRulesPushMutated, 'ALLOWED_AT_RULES cannot be mutated via push()');

let atRulesIndexMutated = false;
try {
    ALLOWED_AT_RULES[0] = 'import';
    atRulesIndexMutated = ALLOWED_AT_RULES[0] === 'import';
} catch {
    atRulesIndexMutated = false;
}
assert(!atRulesIndexMutated, 'ALLOWED_AT_RULES cannot be mutated via index assignment');

// isAllowedAtRule lookup function
assert(isAllowedAtRule('media'), 'isAllowedAtRule permits "media"');
assert(isAllowedAtRule('@media'), 'isAllowedAtRule permits "@media" with leading @');
assert(isAllowedAtRule('page'), 'isAllowedAtRule permits "page"');
assert(isAllowedAtRule('@page'), 'isAllowedAtRule permits "@page"');
assert(isAllowedAtRule('supports'), 'isAllowedAtRule permits "supports"');
assert(isAllowedAtRule('keyframes'), 'isAllowedAtRule permits "keyframes"');
assert(isAllowedAtRule('-webkit-keyframes'), 'isAllowedAtRule permits "-webkit-keyframes"');
assert(!isAllowedAtRule('import'), 'isAllowedAtRule rejects "import"');
assert(!isAllowedAtRule('@import'), 'isAllowedAtRule rejects "@import"');
assert(!isAllowedAtRule('font-face'), 'isAllowedAtRule rejects "font-face"');
assert(!isAllowedAtRule('charset'), 'isAllowedAtRule rejects "charset"');
assert(!isAllowedAtRule(null), 'isAllowedAtRule handles null safely');
assert(!isAllowedAtRule(''), 'isAllowedAtRule handles empty string safely');

// Immutability of FORBIDDEN_PROPERTIES
assert(Array.isArray(FORBIDDEN_PROPERTIES), 'FORBIDDEN_PROPERTIES is an Array');
assert(Object.isFrozen(FORBIDDEN_PROPERTIES), 'FORBIDDEN_PROPERTIES is deeply frozen with Object.freeze');
assert(FORBIDDEN_PROPERTIES.includes('behavior'), 'FORBIDDEN_PROPERTIES includes behavior');
assert(FORBIDDEN_PROPERTIES.includes('-ms-behavior'), 'FORBIDDEN_PROPERTIES includes -ms-behavior');
assert(FORBIDDEN_PROPERTIES.includes('-moz-binding'), 'FORBIDDEN_PROPERTIES includes -moz-binding');
assert(FORBIDDEN_PROPERTIES.add === undefined, 'FORBIDDEN_PROPERTIES does not expose mutable .add() method');

let forbiddenPropsPushMutated = false;
try {
    FORBIDDEN_PROPERTIES.push('color');
    forbiddenPropsPushMutated = true;
} catch {
    forbiddenPropsPushMutated = false;
}
assert(!forbiddenPropsPushMutated, 'FORBIDDEN_PROPERTIES cannot be mutated via push()');

// isForbiddenProperty lookup function
assert(isForbiddenProperty('behavior'), 'isForbiddenProperty flags "behavior"');
assert(isForbiddenProperty('BEHAVIOR'), 'isForbiddenProperty is case-insensitive for "BEHAVIOR"');
assert(isForbiddenProperty('-ms-behavior'), 'isForbiddenProperty flags "-ms-behavior"');
assert(isForbiddenProperty('-moz-binding'), 'isForbiddenProperty flags "-moz-binding"');
assert(!isForbiddenProperty('color'), 'isForbiddenProperty permits "color"');
assert(!isForbiddenProperty('width'), 'isForbiddenProperty permits "width"');
assert(!isForbiddenProperty(null), 'isForbiddenProperty handles null safely');
assert(!isForbiddenProperty(''), 'isForbiddenProperty handles empty string safely');

// =========================================================================
// 2. CSS ESCAPE DECODING TESTS
// =========================================================================
console.log('\n--- 2. Testing CSS Escape Decoder ---');

assert(decodeCssEscapes('jav\\61 script') === 'javascript', 'Decodes hex escape \\61 to "a"');
assert(decodeCssEscapes('exp\\72 ession') === 'expression', 'Decodes hex escape \\72 to "r"');
assert(decodeCssEscapes('\\00006a avascript') === 'javascript', 'Decodes 6-digit zero-padded hex escape with trailing whitespace');
assert(decodeCssEscapes('beh\\61 vior') === 'behavior', 'Decodes behavior property escape');
assert(decodeCssEscapes('@\\69 mport') === '@import', 'Decodes at-rule escape');
assert(decodeCssEscapes('color: red') === 'color: red', 'Preserves unescaped plain string');
assert(decodeCssEscapes('') === '', 'Empty string decodes to empty string');
assert(decodeCssEscapes(null) === '', 'Null input handles safely');

// =========================================================================
// 3. URL POLICY (isSafeUrl) TESTS
// =========================================================================
console.log('\n--- 3. Testing URL Security Policy (isSafeUrl) ---');

// Dangerous schemes
assert(!isSafeUrl('javascript:alert(1)'), 'Blocks javascript: URI');
assert(!isSafeUrl('JAVASCRIPT:alert(1)'), 'Blocks uppercase JAVASCRIPT: URI');
assert(!isSafeUrl('jav\\61 script:alert(1)'), 'Blocks CSS-escaped javascript: URI');
assert(!isSafeUrl('java\tscript:alert(1)'), 'Blocks javascript: URI with tab control character');
assert(!isSafeUrl('java\nscript:alert(1)'), 'Blocks javascript: URI with newline control character');
assert(!isSafeUrl('java\0script:alert(1)'), 'Blocks javascript: URI with null byte character');
assert(!isSafeUrl('vbscript:msgbox(1)'), 'Blocks vbscript: URI');
assert(!isSafeUrl('file:///etc/passwd'), 'Blocks file:/// protocol');
assert(!isSafeUrl('blob:http://example.com/123'), 'Blocks blob: protocol');
assert(!isSafeUrl('about:blank'), 'Blocks about: protocol');

// Data URIs
const safeBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=';
assert(isSafeUrl(safeBase64Png), 'Allows safe base64-encoded PNG data URI');
assert(isSafeUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), 'Allows safe base64 JPEG data URI');
assert(isSafeUrl('data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoB+AA='), 'Allows safe base64 WEBP data URI');
assert(!isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), 'Blocks data:text/html URI');
assert(!isSafeUrl('data:image/svg+xml;utf8,<svg onload="alert(1)"/>'), 'Blocks data:image/svg+xml URI');
assert(!isSafeUrl('data:text/javascript;base64,YWxlcnQoMSk='), 'Blocks data:text/javascript URI');

// Delimiters and injection attempts in URLs
assert(!isSafeUrl('https://example.com/<script>'), 'Blocks URL containing HTML tag delimiter <');
assert(!isSafeUrl('https://example.com/foo}body{color:red}'), 'Blocks URL containing CSS block delimiter }');
assert(!isSafeUrl('https://example.com/"onerror="alert(1)'), 'Blocks URL containing double quote delimiter');
assert(!isSafeUrl("https://example.com/'bad'"), 'Blocks URL containing single quote delimiter');
assert(!isSafeUrl('https://example.com/\\\\bad'), 'Blocks URL containing backslash delimiter');

// Safe web URLs & Relative paths
assert(isSafeUrl('https://example.com/images/logo.png'), 'Allows legitimate HTTPS URL');
assert(isSafeUrl('http://example.com/images/logo.png'), 'Allows legitimate HTTP URL');
assert(isSafeUrl('/assets/images/logo.png'), 'Allows safe relative path');
assert(isSafeUrl('images/watermark.png'), 'Allows relative filename');
assert(isSafeUrl('#company-logo-clip'), 'Allows local fragment identifier');

// External URL disabling option
assert(!isSafeUrl('https://example.com/logo.png', { allowExternalUrls: false }), 'Disallows external HTTPS URL when allowExternalUrls is false');
assert(isSafeUrl('https://example.com/logo.png', { allowExternalUrls: true }), 'Allows external HTTPS URL when allowExternalUrls is true');
assert(isSafeUrl(safeBase64Png, { allowExternalUrls: false }), 'Still allows local data URI when allowExternalUrls is false');

// Protocol-Relative URLs (Finding 2)
assert(!isSafeUrl('//evil.example/image.png', { allowExternalUrls: false }), 'Rejects protocol-relative URL when allowExternalUrls is false');
assert(isSafeUrl('//evil.example/image.png', { allowExternalUrls: true }), 'Accepts protocol-relative URL when allowExternalUrls is true');
assert(isSafeUrl('//evil.example/image.png'), 'Accepts protocol-relative URL by default when allowExternalUrls is omitted');
assert(!isSafeUrl('//evil.example/<script>', { allowExternalUrls: true }), 'Rejects protocol-relative URL containing HTML tag delimiter <');
assert(!isSafeUrl('//evil.example/"onerror=alert(1)', { allowExternalUrls: true }), 'Rejects protocol-relative URL containing double quote delimiter');
assert(!isSafeUrl("//evil.example/'bad'", { allowExternalUrls: true }), 'Rejects protocol-relative URL containing single quote delimiter');
assert(!isSafeUrl('//evil.example/\\\\bad', { allowExternalUrls: true }), 'Rejects protocol-relative URL containing backslash delimiter');
assert(!isSafeUrl('//evil.example/`bad`', { allowExternalUrls: true }), 'Rejects protocol-relative URL containing backtick delimiter');
assert(!isSafeUrl('//evil.example/{bad}', { allowExternalUrls: true }), 'Rejects protocol-relative URL containing curly brace delimiter');
assert(!isSafeUrl('//evil.example/\0bad', { allowExternalUrls: true }), 'Rejects protocol-relative URL containing null byte');
assert(!isSafeUrl('\\2f \\2f evil.example/image.png', { allowExternalUrls: false }), 'Rejects CSS-escaped protocol-relative URL when allowExternalUrls is false');
assert(!isSafeUrl('/\t/evil.example/image.png', { allowExternalUrls: false }), 'Rejects protocol-relative URL with tab control character when allowExternalUrls is false');

// Legitimate relative/local paths with allowExternalUrls: false
assert(isSafeUrl('/images/logo.png', { allowExternalUrls: false }), 'Permits root-relative path /images/logo.png when allowExternalUrls is false');
assert(isSafeUrl('images/logo.png', { allowExternalUrls: false }), 'Permits document-relative path images/logo.png when allowExternalUrls is false');
assert(isSafeUrl('../images/logo.png', { allowExternalUrls: false }), 'Permits directory traversal path ../images/logo.png when allowExternalUrls is false');
assert(isSafeUrl('#company-logo-clip', { allowExternalUrls: false }), 'Permits local fragment anchor when allowExternalUrls is false');

// Dangerous schemes must be rejected regardless of allowExternalUrls setting
assert(!isSafeUrl('javascript:alert(1)', { allowExternalUrls: false }), 'Rejects javascript: when allowExternalUrls is false');
assert(!isSafeUrl('javascript:alert(1)', { allowExternalUrls: true }), 'Rejects javascript: when allowExternalUrls is true');

// =========================================================================
// 4. STYLESHEET SANITIZATION (sanitizeCss) TESTS
// =========================================================================
console.log('\n--- 4. Testing Stylesheet Sanitization (sanitizeCss) ---');

// CSS Expressions
const exprCss = 'body { width: expression(alert(1)); color: red; }';
const exprResult = sanitizeCss(exprCss);
assert(!exprResult.includes('expression'), 'CSS expression function stripped');
assert(exprResult.includes('color:red'), 'Surrounding legitimate declarations preserved');

const pureExprCss = 'body { width: expression(alert(1)); }';
assert(sanitizeCss(pureExprCss) === '', 'Entire rule removed when expression was sole declaration');

const escapedExprCss = 'body { width: exp\\72 ession(alert(1)); }';
assert(sanitizeCss(escapedExprCss) === '', 'Escaped exp\\72 ession completely stripped');

const upperExprCss = 'body { width: EXPRESSION(alert(1)); }';
assert(sanitizeCss(upperExprCss) === '', 'Uppercase EXPRESSION completely stripped');

// JavaScript / VBScript in URLs
const jsUrlCss = 'div { background: url("javascript:alert(1)"); border: 1px solid black; }';
const jsUrlResult = sanitizeCss(jsUrlCss);
assert(!jsUrlResult.includes('javascript'), 'javascript: URL stripped from declaration');
assert(jsUrlResult.includes('border:1px solid black'), 'Valid border declaration preserved');

const escapedJsUrlCss = 'div { background: url("jav\\61 script:alert(1)"); }';
assert(sanitizeCss(escapedJsUrlCss) === '', 'Escaped javascript: URL stripped');

const vbUrlCss = 'div { background: url("vbscript:msgbox(1)"); }';
assert(sanitizeCss(vbUrlCss) === '', 'vbscript: URL stripped');

// @import rules
const importCss = '@import url("https://evil.com/leak.css"); .header { font-size: 16px; }';
const importResult = sanitizeCss(importCss);
assert(!importResult.includes('@import'), '@import rule stripped from stylesheet');
assert(importResult.includes('.header{font-size:16px}'), 'Legitimate rule preserved after @import stripped');

const escapedImportCss = '@\\69 mport "evil.css";';
assert(sanitizeCss(escapedImportCss) === '', 'Escaped @\\69 mport stripped');

const commentImportCss = '@/* comment */import url("evil.css");';
assert(sanitizeCss(commentImportCss) === '', '@import with comments stripped');

// Legacy dangerous properties (behavior, -moz-binding)
const behaviorCss = 'div { behavior: url(test.htc); color: blue; }';
const behaviorResult = sanitizeCss(behaviorCss);
assert(!behaviorResult.includes('behavior'), 'behavior property stripped');
assert(behaviorResult.includes('color:blue'), 'Legitimate declaration retained');

const escapedBehaviorCss = 'div { beh\\61 vior: url(test.htc); }';
assert(sanitizeCss(escapedBehaviorCss) === '', 'Escaped beh\\61 vior property stripped');

const mozBindingCss = 'div { -moz-binding: url(test.xml); }';
assert(sanitizeCss(mozBindingCss) === '', '-moz-binding property stripped');

// Unsupported At-rules
const fontFaceCss = '@font-face { font-family: EvilFont; src: url(https://evil.com/font.woff); } p { color: green; }';
const fontFaceResult = sanitizeCss(fontFaceCss);
assert(!fontFaceResult.includes('@font-face'), '@font-face at-rule stripped');
assert(fontFaceResult.includes('p{color:green}'), 'Legitimate paragraph rule preserved');

const charsetCss = '@charset "UTF-8"; h1 { color: red; }';
const charsetResult = sanitizeCss(charsetCss);
assert(!charsetResult.includes('@charset'), '@charset at-rule stripped');
assert(charsetResult.includes('h1{color:red}'), 'Legitimate heading rule preserved');

// Allowed At-rules (@media, @page, @supports, @keyframes)
const mediaCss = '@media print { .no-print { display: none; } .bad { width: expression(alert(1)); } }';
const mediaResult = sanitizeCss(mediaCss);
assert(mediaResult.includes('@media print'), '@media print rule preserved');
assert(mediaResult.includes('.no-print{display:none}'), 'Valid rule inside @media preserved');
assert(!mediaResult.includes('expression'), 'Dangerous rule inside @media stripped');
assert(!mediaResult.includes('.bad'), 'Empty rule inside @media cleaned up');

const pageCss = '@page { size: A4; margin: 15mm; }';
const pageResult = sanitizeCss(pageCss);
assert(pageResult.includes('@page') && pageResult.includes('margin:15mm'), '@page rule and declarations preserved');

// Safe URLs in stylesheet
const safeImgCss = `.logo { background-image: url("${safeBase64Png}"); color: #2b6cb0; }`;
const safeImgResult = sanitizeCss(safeImgCss);
assert(safeImgResult.includes('background-image:url(data:image/png;base64,'), 'Safe base64 raster image URL preserved in stylesheet');

// Protocol-relative URLs in stylesheet
const protoRelExternalBlocked = sanitizeCss('div { background: url("//evil.example/tracker.png"); color: red; }', { allowExternalUrls: false });
assert(protoRelExternalBlocked === 'div{color:red}', 'Strips protocol-relative URL when allowExternalUrls is false in stylesheet');

const protoRelExternalAllowed = sanitizeCss('div { background: url("//evil.example/tracker.png"); }', { allowExternalUrls: true });
assert(protoRelExternalAllowed.includes('//evil.example/tracker.png'), 'Preserves protocol-relative URL when allowExternalUrls is true in stylesheet');

const rootRelAllowed = sanitizeCss('div { background: url("/images/logo.png"); }', { allowExternalUrls: false });
assert(rootRelAllowed.includes('/images/logo.png'), 'Preserves root-relative URL when allowExternalUrls is false in stylesheet');

// Malformed CSS and syntax error handling
const malformedEmptyCss = 'div { color: ; background: url( }';
assert(sanitizeCss(malformedEmptyCss) === '', 'Malformed empty declarations and broken URL fail safely');

const unclosedBraceCss = 'div { color: red; ';
assert(sanitizeCss(unclosedBraceCss) === 'div{color:red}', 'Unclosed block gracefully closed by AST generator');

const brokenGarbageCss = ';;; {{{ }}} !!! not valid css';
assert(sanitizeCss(brokenGarbageCss) === '', 'Invalid garbage input fails safely to empty string');

// =========================================================================
// 5. INLINE STYLE SANITIZATION (sanitizeInlineStyle) TESTS
// =========================================================================
console.log('\n--- 5. Testing Inline Style Sanitization (sanitizeInlineStyle) ---');

const mixedInline = 'color: red; width: expression(alert(1)); margin: 10px;';
const mixedInlineResult = sanitizeInlineStyle(mixedInline);
assert(mixedInlineResult === 'color:red;margin:10px', 'Strips dangerous expression while preserving valid declarations');

const badInline = 'background: url("javascript:alert(1)");';
assert(sanitizeInlineStyle(badInline) === '', 'Strips pure malicious inline javascript: URL');

const behaviorInline = 'behavior: url(test.htc); -moz-binding: url(test.xml);';
assert(sanitizeInlineStyle(behaviorInline) === '', 'Strips inline behavior and -moz-binding');

const validInline = 'margin: 20px; font-weight: bold; color: #1a365d;';
const validInlineResult = sanitizeInlineStyle(validInline);
assert(validInlineResult === 'margin:20px;font-weight:bold;color:#1a365d', 'Preserves clean multi-declaration inline style');

const safeDataInline = `background-image: url("${safeBase64Png}"); color: blue;`;
const safeDataInlineResult = sanitizeInlineStyle(safeDataInline);
assert(safeDataInlineResult.includes('background-image:url(data:image/png;base64,'), 'Preserves safe data URI in inline style');

// Protocol-relative URLs in inline style
const inlineProtoRelBlocked = sanitizeInlineStyle('background: url("//evil.example/tracker.png"); color: red;', { allowExternalUrls: false });
assert(inlineProtoRelBlocked === 'color:red', 'Strips protocol-relative URL in inline style when allowExternalUrls is false');

const inlineProtoRelAllowed = sanitizeInlineStyle('background: url("//evil.example/tracker.png");', { allowExternalUrls: true });
assert(inlineProtoRelAllowed.includes('//evil.example/tracker.png'), 'Preserves protocol-relative URL in inline style when allowExternalUrls is true');

const inlineRootRelAllowed = sanitizeInlineStyle('background: url("/images/logo.png"); color: red;', { allowExternalUrls: false });
assert(inlineRootRelAllowed === 'background:url(/images/logo.png);color:red', 'Preserves root-relative URL in inline style when allowExternalUrls is false');

const malformedInline = 'color: ; bad declaration;';
assert(sanitizeInlineStyle(malformedInline) === '', 'Malformed inline style fails safely');

// Edge cases
assert(sanitizeInlineStyle('') === '', 'Empty inline style returns empty string');
assert(sanitizeInlineStyle(null) === '', 'Null inline style returns empty string');
assert(sanitizeInlineStyle(123) === '', 'Non-string inline style returns empty string');

console.log(`\nCSS Sanitizer Tests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
