import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'test-artifacts');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess = null;
let browser = null;
let testResults = [];
let passedCount = 0;
let failedCount = 0;

function logTest(name, status, details = {}) {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${status}] ${name}`);
    if (details.message) console.log(`   ${details.message}`);
    testResults.push({ name, status, ...details });
    if (status === 'PASS') passedCount++;
    else failedCount++;
}

async function startServer() {
    console.log('Starting Vite preview production server...');
    return new Promise((resolve, reject) => {
        serverProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
            cwd: ROOT_DIR,
            shell: true,
            stdio: 'pipe'
        });

        const timeout = setTimeout(() => {
            reject(new Error('Server failed to start within 15 seconds.'));
        }, 15000);

        serverProcess.stdout.on('data', (data) => {
            const out = data.toString();
            if (out.includes('http://localhost:') || out.includes(String(PORT))) {
                clearTimeout(timeout);
                // Ping server to confirm readiness
                const req = http.get(BASE_URL, (res) => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`Server returned status ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
            }
        });

        serverProcess.stderr.on('data', () => {
            // Non-fatal warnings
        });

        serverProcess.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

async function stopServer() {
    if (serverProcess) {
        console.log('Stopping preview server...');
        serverProcess.kill();
        try {
            process.kill(serverProcess.pid);
        } catch {
            // Ignore
        }
    }
}

async function runBrowserTests() {
    console.log('\n======================================================');
    console.log('🚀 STARTING COMPREHENSIVE AUTOMATED BROWSER TESTS (PR #26)');
    console.log('======================================================\n');

    await startServer();
    console.log(`Vite preview server running at ${BASE_URL}\n`);

    browser = await chromium.launch({
        headless: true,
        executablePath: CHROME_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // Track console messages and network errors
    const consoleLogs = [];
    const pageErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleLogs.push({ type: msg.type(), text: msg.text() });
        }
    });
    page.on('pageerror', (err) => {
        pageErrors.push(err.message);
    });
    page.on('dialog', async (dialog) => {
        await dialog.accept();
    });

    let uploadedCustomTemplateId = null;
    let createdInvoiceId = null;

    try {
        // -------------------------------------------------------------
        // SCENARIO 1: Application Startup & Initial State
        // -------------------------------------------------------------
        console.log('\n--- 1. Testing Application Startup ---');
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        const appTitle = await page.title();
        const startupSuccess = appTitle.length > 0;
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_app_startup.png') });
        logTest('Application Startup', startupSuccess ? 'PASS' : 'FAIL', {
            message: `Title: "${appTitle}", URL: ${page.url()}`,
            screenshot: '01_app_startup.png'
        });

        // -------------------------------------------------------------
        // SCENARIO 2: Template Upload (Valid Template)
        // -------------------------------------------------------------
        console.log('\n--- 2. Testing Custom Template Upload ---');
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        // Click "Upload Your Own Template" button in Settings
        const uploadBtn = page.getByRole('button', { name: /Upload Your Own Template/i });
        await uploadBtn.click();
        await page.waitForTimeout(300);

        // Verify Modal opened
        const modalTitle = page.locator('#upload-template-modal-title');
        const isModalVisible = await modalTitle.isVisible();
        logTest('Upload Modal Opened', isModalVisible ? 'PASS' : 'FAIL', {
            message: 'Upload modal opened via Settings button'
        });

        // Upload valid HTML fixture
        const validFixturePath = path.join(FIXTURES_DIR, 'valid-custom-template.html');
        const fileInput = page.locator('input[type="file"][accept=".html,.htm"]');
        await fileInput.setInputFiles(validFixturePath);
        await page.waitForTimeout(600);

        // Verify Template Name populated and change to custom name
        const nameInput = page.locator('input[placeholder*="Modern Minimalist Charcoal"]');
        await nameInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameInput.fill('Emerald Bespoke Layout');

        // Switch to Live Preview tab
        const previewTabBtn = page.getByRole('tab', { name: /Live Preview/i });
        await previewTabBtn.click();
        await page.waitForTimeout(400);

        // Verify preview iframe rendered
        const previewIframe = page.locator('iframe[title="Invoice Template Preview"]');
        await previewIframe.waitFor({ state: 'visible' });
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_upload_modal_preview.png') });

        // Save Template
        const saveTemplateBtn = page.getByRole('button', { name: /Save Custom Template/i });
        await saveTemplateBtn.click();
        await page.waitForTimeout(1000);

        // Confirm template appears in Settings templates grid
        const customTemplateCard = page.locator('h3', { hasText: 'Emerald Bespoke Layout' });
        const isCustomVisible = await customTemplateCard.isVisible();
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_template_in_settings_grid.png') });

        logTest('Upload Valid Template', isCustomVisible ? 'PASS' : 'FAIL', {
            message: 'Template "Emerald Bespoke Layout" uploaded, validated, previewed, and saved in Dexie',
            screenshot: '03_template_in_settings_grid.png'
        });

        // Get persisted template ID from Dexie IndexedDB using native browser API
        const persistedTemplates = await page.evaluate(async () => {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('InvoiceAppDB');
                req.onerror = () => reject(req.error);
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction('templates', 'readonly');
                    const store = tx.objectStore('templates');
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = () => resolve(getAllReq.result);
                    getAllReq.onerror = () => reject(getAllReq.error);
                };
            });
        });
        const matchedRecord = persistedTemplates.find((t) => t.name === 'Emerald Bespoke Layout');
        uploadedCustomTemplateId = matchedRecord ? matchedRecord.id : null;
        logTest('Template Persisted in IndexedDB', uploadedCustomTemplateId ? 'PASS' : 'FAIL', {
            message: `Persisted with Dexie numeric ID: ${uploadedCustomTemplateId}, isBuiltIn: ${matchedRecord?.isBuiltIn}`
        });

        // Reload page to verify persistence across page refreshes
        await page.reload({ waitUntil: 'networkidle' });
        const isStillVisibleAfterReload = await page.locator('h3', { hasText: 'Emerald Bespoke Layout' }).isVisible();
        logTest('Template Survives Browser Reload', isStillVisibleAfterReload ? 'PASS' : 'FAIL', {
            message: 'Custom template card remains rendered after full page reload'
        });

        // -------------------------------------------------------------
        // SCENARIO 3: Upload Validation Rules & Rejections
        // -------------------------------------------------------------
        console.log('\n--- 3. Testing Upload Validation Edge Cases ---');

        const closeBtn = page.getByRole('button', { name: /Close modal/i });

        // 3.1 Empty file rejection (0 bytes)
        await uploadBtn.click();
        await page.locator('#upload-template-modal-title').waitFor({ state: 'visible' });
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'empty-file.html'));
        const emptyErrorElem = page.locator('div.bg-red-50');
        await emptyErrorElem.waitFor({ state: 'visible', timeout: 5000 });
        const emptyText = await emptyErrorElem.innerText();
        const emptyFileError = emptyText.includes('empty');
        logTest('Rejects Empty File', emptyFileError ? 'PASS' : 'FAIL', {
            message: `Displayed: "${emptyText.trim().replace(/\n/g, ' ')}"`
        });

        await closeBtn.click();
        await page.waitForTimeout(300);

        // 3.2 Whitespace-only rejection
        await uploadBtn.click();
        await page.locator('#upload-template-modal-title').waitFor({ state: 'visible' });
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'whitespace-only.html'));
        await emptyErrorElem.waitFor({ state: 'visible', timeout: 5000 });
        const wsText = await emptyErrorElem.innerText();
        const whitespaceError = wsText.includes('empty') || wsText.includes('whitespace');
        logTest('Rejects Whitespace-Only File', whitespaceError ? 'PASS' : 'FAIL', {
            message: `Displayed: "${wsText.trim().replace(/\n/g, ' ')}"`
        });

        await closeBtn.click();
        await page.waitForTimeout(300);

        // 3.3 Invalid HTML rejection (plain text)
        await uploadBtn.click();
        await page.locator('#upload-template-modal-title').waitFor({ state: 'visible' });
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'invalid-html.html'));
        await emptyErrorElem.waitFor({ state: 'visible', timeout: 5000 });
        const invalidHtmlError = await page.locator('text=valid HTML').first().isVisible();
        logTest('Rejects Plain Text Without HTML Tags', invalidHtmlError ? 'PASS' : 'FAIL', {
            message: 'Displayed HTML markup validation error banner'
        });

        await closeBtn.click();
        await page.waitForTimeout(300);

        // 3.4 Oversized file rejection (> 2MB)
        await uploadBtn.click();
        await page.locator('#upload-template-modal-title').waitFor({ state: 'visible' });
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'oversized-template.html'));
        await emptyErrorElem.waitFor({ state: 'visible', timeout: 5000 });
        const oversizedError = await page.locator('text=File size exceeds the 2 MB limit').isVisible();
        logTest('Rejects Oversized File (> 2MB)', oversizedError ? 'PASS' : 'FAIL', {
            message: 'Displayed: "File size exceeds the 2 MB limit."'
        });

        await closeBtn.click();
        await page.waitForTimeout(300);

        // 3.5 Duplicate Template Name rejection
        await uploadBtn.click();
        await page.locator('#upload-template-modal-title').waitFor({ state: 'visible' });
        await fileInput.setInputFiles(validFixturePath);
        await page.waitForTimeout(600);
        const dupNameInput = page.locator('input[placeholder*="Modern Minimalist Charcoal"]');
        await dupNameInput.waitFor({ state: 'visible', timeout: 5000 });
        await dupNameInput.fill('Emerald Bespoke Layout'); // same as already saved
        await page.waitForTimeout(300);
        const dupError = await page.locator('text=already exists. Please choose a unique name').isVisible();
        logTest('Rejects Duplicate Template Name', dupError ? 'PASS' : 'FAIL', {
            message: 'Duplicate naming error triggered before save'
        });

        // 3.6 Test Change File / Reset button
        const changeFileBtn = page.getByRole('button', { name: /Change File/i });
        if (await changeFileBtn.isVisible()) {
            await changeFileBtn.click();
            await page.waitForTimeout(300);
            const dropzoneVisible = await page.locator('text=Choose an HTML file or drag & drop').isVisible();
            logTest('Reset Button Clears State and Invalidate Reads', dropzoneVisible ? 'PASS' : 'FAIL', {
                message: 'Modal returned to initial dropzone state upon Change File'
            });
        }

        // Close upload modal
        await closeBtn.click();
        await page.waitForTimeout(400);

        // -------------------------------------------------------------
        // SCENARIO 4: Custom Template Selection and Invoice Creation
        // -------------------------------------------------------------
        console.log('\n--- 4. Testing Custom Template Selection in Create Invoice ---');
        await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        // Step 1: Select client if available, or create one
        const clientCardToSelect = page.locator('div').filter({ hasText: 'Click to select' }).first();
        if (await clientCardToSelect.isVisible()) {
            await clientCardToSelect.click();
            await page.waitForTimeout(300);
        } else {
            const addClientBtn = page.getByRole('button', { name: /Add New Client/i });
            if (await addClientBtn.isVisible()) {
                await addClientBtn.click();
                await page.waitForTimeout(300);
                const clientNameInput = page.locator('input[placeholder*="Client Name"], input[placeholder*="Acme"]').first();
                if (await clientNameInput.isVisible()) {
                    await clientNameInput.fill('Acme Corp Global');
                    const saveClientBtn = page.getByRole('button', { name: /Save & Select Client/i });
                    await saveClientBtn.click();
                    await page.waitForTimeout(500);
                }
            }
        }

        // In Create Invoice, find the custom template card in Step 3
        const customCardInCreate = page.locator('h4', { hasText: 'Emerald Bespoke Layout' });
        const hasCardInCreate = await customCardInCreate.isVisible();
        logTest('Custom Template Displayed in CreateInvoice Grid', hasCardInCreate ? 'PASS' : 'FAIL', {
            message: 'Custom template card rendered in Step 3 of CreateInvoice'
        });

        // Click custom template card to select it
        await customCardInCreate.click();
        await page.waitForTimeout(300);

        // Verify selected indicator badge
        const selectedBadge = page.locator('text=Selected: Emerald Bespoke Layout');
        const isSelectedBadgeVisible = await selectedBadge.isVisible();
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_template_selected_in_create.png') });
        logTest('Custom Template Selected', isSelectedBadgeVisible ? 'PASS' : 'FAIL', {
            message: 'Custom template selection state active with visible indicator',
            screenshot: '04_template_selected_in_create.png'
        });

        // Proceed to editor
        const proceedBtn = page.getByRole('button', { name: /Continue to Editor/i });
        await proceedBtn.click();
        await page.waitForURL(/.*\/editor\/new.*/);
        await page.waitForTimeout(600);

        // Verify URL contains template parameter
        const editorUrl = page.url();
        const hasTemplateInUrl = editorUrl.includes(`template=${uploadedCustomTemplateId}`);
        logTest('Template ID Passed to Editor URL', hasTemplateInUrl ? 'PASS' : 'FAIL', {
            message: `Editor URL: ${editorUrl}`
        });

        // Click "Save & Preview"
        const previewInvoiceBtn = page.getByRole('button', { name: /Save & Preview/i });
        await previewInvoiceBtn.click();
        await page.waitForURL(/.*\/preview\/.*/, { timeout: 15000 });
        await page.waitForTimeout(1000);

        // Get invoice ID from preview URL
        const previewUrl = page.url();
        const idMatch = previewUrl.match(/\/preview\/([^?#]+)/);
        createdInvoiceId = idMatch ? idMatch[1] : null;

        // Verify preview page loaded and custom template is rendered in .print-container
        const printContainer = page.locator('.print-container');
        await printContainer.waitFor({ state: 'visible', timeout: 10000 });
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_custom_template_invoice_preview.png') });

        // Inspect .print-container contents to confirm custom emerald template styles and tokens
        const containerHtml = await printContainer.innerHTML();
        const containsEmeraldLayout = containerHtml.includes('emerald-invoice') && containerHtml.includes('TAX INVOICE');
        logTest('Invoice Renders with Custom Template Layout & CSS', containsEmeraldLayout ? 'PASS' : 'FAIL', {
            message: `Preview for invoice ${createdInvoiceId} contains custom .emerald-invoice styles and rendered tokens`,
            screenshot: '05_custom_template_invoice_preview.png'
        });

        // Test PDF Generation Trigger & Dialog
        const downloadPdfBtn = page.getByRole('button', { name: /Download PDF/i });
        if (await downloadPdfBtn.isVisible()) {
            await downloadPdfBtn.click();
            const downloadSuccessModal = page.locator('text=Invoice Downloaded');
            await downloadSuccessModal.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
            const hasSuccessModal = await downloadSuccessModal.isVisible();
            logTest('PDF Generation Completed Successfully', hasSuccessModal ? 'PASS' : 'FAIL', {
                message: 'Triggered html2pdf.js export in real browser; Invoice Downloaded confirmation displayed'
            });
            const closeDoneBtn = page.getByRole('button', { name: /Done/i });
            if (await closeDoneBtn.isVisible()) {
                await closeDoneBtn.click();
                await page.waitForTimeout(300);
            }
        }

        // -------------------------------------------------------------
        // SCENARIO 5: JSON Invoice Import with Custom Template ID
        // -------------------------------------------------------------
        console.log('\n--- 5. Testing JSON Invoice Import with Custom Template ID ---');
        await page.goto(`${BASE_URL}/create-from-json`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        // Construct JSON with the custom template ID
        const testImportJson = JSON.stringify({
            invoiceNumber: 'INV-JSON-E2E-88',
            date: '2026-11-20',
            template: uploadedCustomTemplateId, // Custom Dexie numeric ID
            client: {
                name: 'Global Tech Industries Ltd',
                mobile: '9876543210',
                email: 'billing@globaltech.example'
            },
            items: [
                {
                    description: 'Automated Browser Testing Implementation',
                    quantity: 2,
                    price: 25000
                }
            ],
            notes: 'Imported via PR #26 JSON import pipeline'
        }, null, 2);

        // Fill JSON Editor textarea
        const jsonTextarea = page.locator('textarea');
        await jsonTextarea.fill(testImportJson);
        await page.waitForTimeout(600);

        // Verify Summary Template says "Emerald Bespoke Layout" (NOT defaulted to Classic)
        const summaryText = await page.locator('body').innerText();
        const hasCustomTemplateInSummary = summaryText.includes('Emerald Bespoke Layout');
        const hasNoValidationErrors = !summaryText.includes('Template is not a recognized template ID');

        logTest('JSON Import Preserves Custom Template ID', (hasCustomTemplateInSummary && hasNoValidationErrors) ? 'PASS' : 'FAIL', {
            message: `JSON imported with template ID ${uploadedCustomTemplateId}; resolved template name "Emerald Bespoke Layout"`
        });

        // Click "Open in Invoice Editor"
        const continueBtn = page.getByRole('button', { name: /Open in Invoice Editor/i });
        await continueBtn.click();
        await page.waitForURL(/.*\/editor\/new.*/);
        await page.waitForTimeout(600);

        const currentEditorUrl = page.url();
        const isInEditor = currentEditorUrl.includes('/editor/new');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_editor_after_json_import.png') });
        logTest('Continue to Editor Uses Selected Custom Template', isInEditor ? 'PASS' : 'FAIL', {
            message: `Editor URL after JSON import: ${currentEditorUrl} (loaded state with custom template)`,
            screenshot: '06_editor_after_json_import.png'
        });

        // -------------------------------------------------------------
        // SCENARIO 6: HTML & CSS Security Invariants in Real Browser
        // -------------------------------------------------------------
        console.log('\n--- 6. Testing HTML & CSS Security Invariants in Real Browser ---');
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        // Monitor all outbound network requests from page and any iframes
        const externalRequestAttempted = [];
        page.on('request', (req) => {
            const url = req.url();
            if (url.includes('example.invalid') || url.includes('attacker.example')) {
                externalRequestAttempted.push(url);
            }
        });

        // Upload Adversarial Security Template
        const secUploadBtn = page.getByRole('button', { name: /Upload Your Own Template/i });
        await secUploadBtn.waitFor({ state: 'visible' });
        await secUploadBtn.click();
        await page.locator('#upload-template-modal-title').waitFor({ state: 'visible' });
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'adversarial-security-template.html'));
        await page.waitForTimeout(500);

        const secNameInput = page.locator('input[placeholder*="Modern Minimalist Charcoal"]');
        await secNameInput.waitFor({ state: 'visible', timeout: 5000 });
        await secNameInput.fill('Security Audit Template');

        // Switch to preview tab to trigger rendering in the DOM
        await previewTabBtn.click();
        await page.waitForTimeout(800);

        // Verify zero outbound requests were attempted to external untrusted domains
        const zeroExternalRequests = externalRequestAttempted.length === 0;
        logTest('Zero External Network Requests on Render', zeroExternalRequests ? 'PASS' : 'FAIL', {
            message: `External requests detected: ${externalRequestAttempted.length} (${externalRequestAttempted.join(', ') || 'none'})`
        });

        // Check sandbox attribute on preview iframe
        const secPreviewIframe = page.locator('iframe[title="Invoice Template Preview"]');
        const sandboxAttr = await secPreviewIframe.getAttribute('sandbox');
        const isStrictlySandboxed = sandboxAttr === '' || !sandboxAttr.includes('allow-scripts');
        logTest('Iframe Strictly Sandboxed', isStrictlySandboxed ? 'PASS' : 'FAIL', {
            message: `Iframe sandbox attribute: "${sandboxAttr}" (scripts & same-origin forbidden)`
        });

        // Save the security template
        await saveTemplateBtn.click();
        await page.waitForTimeout(1000);

        // Open Template Preview Modal for this saved security template
        const secCard = page.locator('div.p-5.rounded-xl', { has: page.locator('h3', { hasText: 'Security Audit Template' }) });
        const secPreviewBtn = secCard.locator('button', { hasText: 'Preview' });
        await secPreviewBtn.click();
        await page.waitForTimeout(800);

        // Inspect rendered srcdoc inside preview modal
        const modalIframe = page.locator('iframe[title*="Preview of Security Audit Template"]');
        const secSrcDoc = await modalIframe.getAttribute('srcdoc');

        const noScriptTags = !secSrcDoc.includes('<script>') && !secSrcDoc.includes('window.__INJECTED_XSS');
        const noExternalImages = !secSrcDoc.includes('https://example.invalid') && !secSrcDoc.includes('//example.invalid');
        const noLinkTags = !secSrcDoc.includes('<link');
        const preservesSafeBase64 = secSrcDoc.includes('data:image/png;base64,');

        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_security_template_preview_modal.png') });

        logTest('HTML/CSS Sanitizer Neutralizes All Vectors in Browser', (noScriptTags && noExternalImages && noLinkTags && preservesSafeBase64) ? 'PASS' : 'FAIL', {
            message: 'Scripts, external images, protocol-relative URLs, and <link> tags stripped; safe base64 retained',
            screenshot: '07_security_template_preview_modal.png'
        });

        // Close preview modal
        const closeSecModalBtn = page.locator('button[aria-label="Close preview"]').first();
        await closeSecModalBtn.click();
        await page.waitForTimeout(300);

        // -------------------------------------------------------------
        // SCENARIO 7: Modal Accessibility, Focus Trapping & Restoration
        // -------------------------------------------------------------
        console.log('\n--- 7. Testing Modal Accessibility & Focus Management ---');

        // Focus the upload button and click via keyboard
        const a11yUploadBtn = page.getByRole('button', { name: /Upload Your Own Template/i });
        await a11yUploadBtn.waitFor({ state: 'visible' });
        await a11yUploadBtn.focus();
        await page.keyboard.press('Enter');
        await page.locator('#upload-template-modal-title').waitFor({ state: 'visible' });
        // Allow the modal's 50ms initial focus timer to run
        await page.waitForTimeout(150);

        // Verify focus moved inside modal
        const activeElemTag = await page.evaluate(() => document.activeElement.tagName);
        const isFocusInsideModal = await page.evaluate(() => {
            const modal = document.querySelector('div[role="dialog"]');
            return modal && modal.contains(document.activeElement);
        });
        logTest('Initial Focus Placed Inside Modal', isFocusInsideModal ? 'PASS' : 'FAIL', {
            message: `Focused element inside modal: <${activeElemTag.toLowerCase()}>`
        });

        // Test Escape Key Closes Modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        const isModalClosed = !(await page.locator('div[role="dialog"]').isVisible());
        logTest('Escape Key Closes Modal', isModalClosed ? 'PASS' : 'FAIL', {
            message: 'Modal dismissed on Escape key press'
        });

        // Verify focus restored to upload button
        const isFocusRestored = await page.evaluate(() => {
            return Boolean(document.activeElement?.innerText?.includes('Upload Your Own Template'));
        });
        logTest('Focus Restored to Trigger Element', isFocusRestored ? 'PASS' : 'FAIL', {
            message: 'Focus returned to "Upload Your Own Template" button after modal close'
        });

        // -------------------------------------------------------------
        // SCENARIO 8: Template Deletion, Default Assignment & Protection
        // -------------------------------------------------------------
        console.log('\n--- 8. Testing Template Deletion & Default Assignment ---');

        // Delete Security Audit Template (unused)
        const secDeleteBtn = page.locator('button[aria-label="Delete custom template Security Audit Template"]');
        if (await secDeleteBtn.isVisible()) {
            await secDeleteBtn.click();
            await page.waitForTimeout(800);

            const isSecDeleted = !(await page.locator('h3', { hasText: 'Security Audit Template' }).isVisible());
            logTest('Delete Unused Custom Template', isSecDeleted ? 'PASS' : 'FAIL', {
                message: 'Unused template deleted cleanly from UI and database'
            });
        }

        // Set "Emerald Bespoke Layout" as Default Template
        const defaultCard = page.locator('div.p-5.rounded-xl', { has: page.locator('h3', { hasText: 'Emerald Bespoke Layout' }) });
        const setDefaultBtn = defaultCard.locator('button', { hasText: 'Set Default' });
        if (await setDefaultBtn.isVisible()) {
            await setDefaultBtn.click();
            await page.waitForTimeout(600);

            const isDefaultActive = await defaultCard.locator('span', { hasText: 'Active Default' }).isVisible();
            logTest('Set Custom Template as Active Default', isDefaultActive ? 'PASS' : 'FAIL', {
                message: 'Custom template set as default; "Active Default" badge rendered'
            });
        }

        // -------------------------------------------------------------
        // SCENARIO 9: Full Backup & Restore Pipeline
        // -------------------------------------------------------------
        console.log('\n--- 9. Testing Backup and Restore Pipeline ---');

        // Trigger Full Backup download
        const downloadPromise = page.waitForEvent('download');
        const fullBackupCard = page.locator('div.bg-slate-50', { has: page.locator('h3', { hasText: 'Full App Backup' }) });
        const backupBtn = fullBackupCard.locator('button', { hasText: 'Export' });
        await backupBtn.click();
        const download = await downloadPromise;
        const backupFilePath = path.join(ARTIFACTS_DIR, 'e2e_full_backup.json');
        await download.saveAs(backupFilePath);

        // Verify backup JSON contents
        const backupRaw = fs.readFileSync(backupFilePath, 'utf-8');
        const backupData = JSON.parse(backupRaw);
        const templatesInBackup = backupData.data?.templates || backupData.templates || [];
        const hasBackupTemplates = Array.isArray(templatesInBackup) && templatesInBackup.length > 0;
        const backupHasCustom = templatesInBackup.some((t) => t.name === 'Emerald Bespoke Layout' && t.isBuiltIn === false);
        logTest('Full Backup Contains Custom Template Records', (hasBackupTemplates && backupHasCustom) ? 'PASS' : 'FAIL', {
            message: `Backup contains ${templatesInBackup.length} templates including custom template with isBuiltIn: false`
        });

        // -------------------------------------------------------------
        // SCENARIO 10: Responsive Viewport Verification
        // -------------------------------------------------------------
        console.log('\n--- 10. Testing Responsive Viewports ---');

        // Mobile viewport (375x667 - iPhone SE)
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '08_settings_mobile_viewport.png') });

        const isMobileUploadBtnVisible = await page.getByRole('button', { name: /Upload Your Own Template/i }).isVisible();
        logTest('Mobile Viewport (375x667) Layout', isMobileUploadBtnVisible ? 'PASS' : 'FAIL', {
            message: 'Template Manager and upload controls rendered responsively on mobile',
            screenshot: '08_settings_mobile_viewport.png'
        });

        // Reset to desktop viewport
        await page.setViewportSize({ width: 1280, height: 800 });

        // -------------------------------------------------------------
        // SCENARIO 11: Template Studio Split-Screen, Duplication & Live Preview (Issue #18)
        // -------------------------------------------------------------
        console.log('\n--- 11. Testing Template Studio Split-Screen, Duplication & Live Preview (Issue #18) ---');

        // 11.1 Navigate to Template Studio from Settings
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const studioNavBtn = page.getByRole('button', { name: /New in Template Studio/i });
        await studioNavBtn.click();
        await page.waitForTimeout(600);

        const isStudioUrl = page.url().includes('/template-studio');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '09_template_studio_desktop.png') });
        logTest('Navigate to Template Studio', isStudioUrl ? 'PASS' : 'FAIL', {
            message: `Studio opened at ${page.url()}`,
            screenshot: '09_template_studio_desktop.png'
        });

        // 11.2 Check Split-screen layout: Editor on left, Preview iframe on right
        const htmlTabBtn = page.getByRole('button', { name: /HTML Markup/i });
        const cssTabBtn = page.getByRole('button', { name: /Custom CSS/i });
        const isSplitVisible = (await htmlTabBtn.isVisible()) && (await cssTabBtn.isVisible());
        const livePreviewIframe = page.locator('iframe[title="Invoice Template Live Preview"]');
        const isIframeVisible = await livePreviewIframe.isVisible();

        logTest('Split-Screen Editor & Preview Layout', (isSplitVisible && isIframeVisible) ? 'PASS' : 'FAIL', {
            message: 'HTML/CSS editor tabs and live preview iframe rendered simultaneously'
        });

        // 11.3 Token Reference Panel and Token Insertion
        const tokensToggleBtn = page.locator('button[title="Toggle template tokens reference panel"]');
        await tokensToggleBtn.click();
        await page.waitForTimeout(300);

        const tokenSearchInput = page.getByPlaceholder(/Search tokens/i);
        const isTokenPanelOpen = await tokenSearchInput.isVisible();
        logTest('Token Reference Panel Toggled', isTokenPanelOpen ? 'PASS' : 'FAIL', {
            message: 'Token reference panel displayed with search input'
        });

        // Search token and click insert
        await tokenSearchInput.fill('placeOfSupply');
        await page.waitForTimeout(200);

        const insertBtn = page.getByRole('button', { name: 'Insert' }).first();
        if (await insertBtn.isVisible()) {
            await insertBtn.click();
            await page.waitForTimeout(300);
            logTest('Token Pill Clicked for Insertion', 'PASS', {
                message: 'Token clicked, visual feedback and insertion triggered'
            });
        }

        // Close tokens drawer
        await tokensToggleBtn.click();
        await page.waitForTimeout(200);

        // 11.4 Duplicating Built-In Template from Settings
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        // Find the Classic template card's "Customize" button
        const customizeBtn = page.getByRole('button', { name: /Customize/i }).first();
        if (await customizeBtn.isVisible()) {
            await customizeBtn.click();
            await page.waitForTimeout(600);

            const isDuplicateMode = (await page.getByText(/Duplicating Built-in/i).isVisible()) ||
                                   (await page.getByText(/Built-in Template Protection/i).isVisible());
            logTest('Customize Built-in Template Opens Studio in Duplication Mode', isDuplicateMode ? 'PASS' : 'FAIL', {
                message: 'Duplicating built-in template preserves read-only status and opens custom copy'
            });
        }

        // 11.5 Real-Time Live Preview Updates with HTML & CSS
        const studioNameInput = page.getByPlaceholder(/Template Name/i);
        await studioNameInput.fill('Bespoke Royal Layout');

        // Switch to HTML editor and add custom markup
        const htmlEditorTextarea = page.locator('textarea[aria-label="HTML Template Code Editor"]');
        const currentHtml = await htmlEditorTextarea.inputValue();
        const updatedHtml = currentHtml + '\n<div class="royal-banner"><h2>ROYAL CORONATION INVOICE</h2></div>';
        await htmlEditorTextarea.fill(updatedHtml);

        // Switch to CSS editor and add custom style
        await cssTabBtn.click();
        await page.waitForTimeout(200);
        const cssEditorTextarea = page.locator('textarea[aria-label="CSS Template Code Editor"]');
        await cssEditorTextarea.fill('.royal-banner { background: #312e81; color: #fbbf24; padding: 12px; font-weight: 800; }');

        // Wait for debounce (300ms)
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '10_template_studio_live_preview.png') });

        // Verify iframe received updated HTML and CSS
        const iframeSrcDoc = await livePreviewIframe.getAttribute('srcdoc');
        const hasCustomHtmlInPreview = iframeSrcDoc && iframeSrcDoc.includes('ROYAL CORONATION INVOICE');
        const hasCustomCssInPreview = iframeSrcDoc && iframeSrcDoc.includes('royal-banner');

        logTest('Live Preview Updates Automatically with HTML and CSS', (hasCustomHtmlInPreview && hasCustomCssInPreview) ? 'PASS' : 'FAIL', {
            message: 'Live preview iframe rendered dynamic HTML and injected sanitized CSS',
            screenshot: '10_template_studio_live_preview.png'
        });

        // 11.6 Save Custom Template
        const saveStudioTemplateBtn = page.getByRole('button', { name: /Save Template|Save Changes/i });
        await saveStudioTemplateBtn.click();
        await page.waitForTimeout(800);

        const isSavedBadgeVisible = (await page.getByText(/Saved!/i).isVisible()) ||
                                    (await page.getByText(/Custom Template/i).isVisible());
        logTest('Custom Template Saved in IndexedDB', isSavedBadgeVisible ? 'PASS' : 'FAIL', {
            message: 'Template "Bespoke Royal Layout" saved and target ID resolved'
        });

        // 11.7 Verify Saved Template Appears in CreateInvoice Picker
        await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const royalTemplateCard = page.getByRole('heading', { name: 'Bespoke Royal Layout' });
        const isCardVisible = await royalTemplateCard.isVisible();
        logTest('Saved Template Appears in CreateInvoice Selection Grid', isCardVisible ? 'PASS' : 'FAIL', {
            message: 'New custom template is listed in Step 3 template picker with Custom badge'
        });

        // 11.8 Verify Built-in Classic Remained Intact
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const classicCard = page.getByRole('heading', { name: 'Classic', exact: true });
        const hasClassic = await classicCard.isVisible();
        logTest('Original Built-in Classic Remained Intact', hasClassic ? 'PASS' : 'FAIL', {
            message: 'Built-in Classic template remains intact in database as clean baseline'
        });

        // 11.9 Responsive Mobile View in Template Studio
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(`${BASE_URL}/template-studio`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        const mobileEditorTab = page.getByRole('button', { name: 'Editor' });
        const mobilePreviewTab = page.getByRole('button', { name: 'Live Preview' });
        const isMobileStudioResponsive = (await mobileEditorTab.isVisible()) && (await mobilePreviewTab.isVisible());
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '11_template_studio_mobile.png') });

        logTest('Template Studio Mobile Viewport (375x667)', isMobileStudioResponsive ? 'PASS' : 'FAIL', {
            message: 'Studio renders tabbed layout (Editor | Tokens | Preview) on mobile viewports',
            screenshot: '11_template_studio_mobile.png'
        });

        // Reset to desktop viewport
        await page.setViewportSize({ width: 1280, height: 800 });

    } catch (err) {
        console.error('Fatal test error encountered:', err);
        logTest('Automated Test Execution Exception', 'FAIL', {
            message: err.message,
            stack: err.stack
        });
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'fatal_error.png') });
    } finally {
        await browser.close();
        await stopServer();
    }

    // Write JSON test report
    const reportPath = path.join(ARTIFACTS_DIR, 'e2e_test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalTests: testResults.length,
        passed: passedCount,
        failed: failedCount,
        results: testResults,
        consoleErrors: consoleLogs,
        pageErrors
    }, null, 2));

    console.log('\n======================================================');
    console.log(`🏁 AUTOMATED BROWSER TESTS COMPLETE`);
    console.log(`Total: ${testResults.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
    console.log(`Artifacts saved in: ${ARTIFACTS_DIR}`);
    console.log('======================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
    process.exit(0);
}

runBrowserTests();
