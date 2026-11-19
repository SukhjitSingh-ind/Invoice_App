import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
    './constants/constants.test.js',
    './utils/invoiceCalculations.test.js',
    './utils/numberToWords.test.js',
    './utils/validation.test.js',
    './utils/cssSanitizer.test.js',
    './utils/templates.test.js',
    './utils/clientHelpers.test.js',
    './utils/jsonInvoiceParser.test.js',
    './services/migrationService.test.js',
    './services/templateService.test.js',
    './utils/templateValidator.test.js'
];

async function runTests() {
    for (const file of testFiles) {
        console.log(`\n--- Running ${file} ---`);
        const p = spawn('node', ['--experimental-strip-types', path.join(__dirname, file)], { stdio: 'inherit' });

        await new Promise((resolve) => {
            p.on('close', (code) => {
                if (code !== 0) {
                    console.error(`${file} failed.`);
                    process.exit(1);
                }
                resolve();
            });
        });
    }
    console.log('\nAll tests passed!');
}

runTests();
