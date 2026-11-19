import {
    sanitizeCss,
    sanitizeInlineStyle,
    isSafeUrl,
    decodeCssEscapes,
    ALLOWED_AT_RULES,
    FORBIDDEN_PROPERTIES
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
// 1. CONSTANTS & POLICY CONFIGURATION TESTS
// =========================================================================
console.log('\n--- 1. Testing Policy Constants & Immutability ---');

assert(ALLOWED_AT_RULES instanceof Set && ALLOWED_AT_RULES.has('media'), 'ALLOWED_AT_RULES includes media');
assert(ALLOWED_AT_RULES.has('page'), 'ALLOWED_AT_RULES includes page');
assert(ALLOWED_AT_RULES.has('supports'), 'ALLOWED_AT_RULES includes supports');
assert(!ALLOWED_AT_RULES.has('import'), 'ALLOWED_AT_RULES excludes import');
assert(!ALLOWED_AT_RULES.has('font-face'), 'ALLOWED_AT_RULES excludes font-face');
assert(Object.isFrozen(ALLOWED_AT_RULES), 'ALLOWED_AT_RULES is immutable');

assert(FORBIDDEN_PROPERTIES instanceof Set && FORBIDDEN_PROPERTIES.has('behavior'), 'FORBIDDEN_PROPERTIES includes behavior');
assert(FORBIDDEN_PROPERTIES.has('-moz-binding'), 'FORBIDDEN_PROPERTIES includes -moz-binding');
assert(Object.isFrozen(FORBIDDEN_PROPERTIES), 'FORBIDDEN_PROPERTIES is immutable');

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
assert(isSafeUrl(safeBase64Png, { allowExternalUrls: false }), 'Still allows local data URI when allowExternalUrls is false');

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

const malformedInline = 'color: ; bad declaration;';
assert(sanitizeInlineStyle(malformedInline) === '', 'Malformed inline style fails safely');

// Edge cases
assert(sanitizeInlineStyle('') === '', 'Empty inline style returns empty string');
assert(sanitizeInlineStyle(null) === '', 'Null inline style returns empty string');
assert(sanitizeInlineStyle(123) === '', 'Non-string inline style returns empty string');

console.log(`\nCSS Sanitizer Tests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
