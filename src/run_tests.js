import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
    './utils/invoiceCalculations.test.js',
    './utils/numberToWords.test.js',
    './utils/validation.test.js'
];

async function runTests() {
    for (const file of testFiles) {
        console.log(`\n--- Running ${file} ---`);
        const p = spawn('node', [path.join(__dirname, file)], { stdio: 'inherit' });

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
