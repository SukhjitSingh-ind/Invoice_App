import { validateGST, validateEmail, validatePhone } from './validation.js';

console.log('Running Validation Tests...');

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

// GST Validation
// 22AAAAA0000A1Z5 - Valid
assert(validateGST('22AAAAA0000A1Z5') === true, 'Valid GST should pass');
assert(validateGST('22AAAAA0000A1Z55') === false, 'Invalid GST length should fail');
assert(validateGST('') === false, 'Empty GST should fail');

// Email Validation
assert(validateEmail('test@example.com') === true, 'Valid email should pass');
assert(validateEmail('invalid-email') === false, 'Invalid email should fail');

// Phone Validation
assert(validatePhone('1234567890') === true, '10 digit phone should pass');
assert(validatePhone('123') === false, 'Short phone should fail');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
