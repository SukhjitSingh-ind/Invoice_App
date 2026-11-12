import { numberToWords } from './numberToWords.js';

console.log('Running NumberToWords Tests...');

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

assert(numberToWords(0) === 'Zero', `0 should be 'Zero', got '${numberToWords(0)}'`);
assert(numberToWords(10) === 'Ten Rupees only', `10 should be 'Ten Rupees only', got '${numberToWords(10)}'`);
assert(numberToWords(105) === 'One Hundred and Five Rupees only', `105 should be 'One Hundred and Five Rupees only', got '${numberToWords(105)}'`);
assert(numberToWords(1000) === 'One Thousand Rupees only', `1000 should be 'One Thousand Rupees only', got '${numberToWords(1000)}'`);
assert(numberToWords(1500.50) === 'One Thousand Five Hundred Rupees and Fifty Paise only', `1500.50 should be 'One Thousand Five Hundred Rupees and Fifty Paise only', got '${numberToWords(1500.50)}'`);

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
