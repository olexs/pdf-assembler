import {expect, test} from '@playwright/test'
import {
    ElectronAppInfo,
    findLatestBuild,
    parseElectronApp,
} from 'electron-playwright-helpers'
import {ElectronApplication, Page, _electron as electron} from 'playwright'
import * as path from 'path';
import * as fs from 'fs';
import {comparePDFs, getActualPDFPath, getExpectedPDFPath, saveExpectedPDF} from './pdfCompare';

let electronApp: ElectronApplication;
let appInfo: ElectronAppInfo;
let currentPage: Page;

// Environment variable to update baselines: UPDATE_SNAPSHOTS=true npm run e2e
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === 'true';

// Track whether app close is expected (from afterEach) or an unexpected crash
let expectedClose = false;

test.beforeAll(async () => {
    // find the latest build in the out directory
    const latestBuild = findLatestBuild();
    // parse the directory and find paths and other info
    appInfo = parseElectronApp(latestBuild);
    // set the CI environment variable to true
    process.env.CI = 'e2e';

    // Ensure outputs directory exists
    const outputsDir = path.join(__dirname, 'outputs');
    if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
    }
});

async function launchApp(...args: string[]): Promise<Page> {
    // Reset expected close flag for new app instance
    expectedClose = false;

    electronApp = await electron.launch({
        args: [appInfo.main, ...args],
        executablePath: appInfo.executable
    });

    // Capture app crashes and distinguish from expected closes
    electronApp.on('close', () => {
        if (expectedClose) {
            console.log('Electron app closed (expected after test completion)');
        } else {
            console.error('Electron app closed unexpectedly (CRASH during test execution)');
        }
    });

    electronApp.on('window', async (page) => {
        const filename = page.url()?.split('/').pop();
        console.log(`Window opened: ${filename}`);

        // capture errors
        page.on('pageerror', (error) => {
            console.error('Page error:', error);
        });
        // capture console messages
        page.on('console', (msg) => {
            console.log(`[${msg.type()}]`, msg.text());
        });
        // capture crashed pages
        page.on('crash', () => {
            console.error('Page crashed');
        });
    });

    currentPage = await electronApp.firstWindow();
    return currentPage;
}

test.afterEach(async () => {
    // Clear localStorage to prevent state poisoning between tests
    // Use the stored page reference instead of calling firstWindow() again
    await currentPage.evaluate(() => {
        localStorage.clear();
    });

    // Mark close as expected before closing
    expectedClose = true;
    await electronApp.close();

    // Add delay between tests to ensure cleanup completes on Windows
    await new Promise(resolve => setTimeout(resolve, 1000));
});

/**
 * Helper function to save PDF and compare with baseline
 */
async function savePDFAndCompare(page: Page, testName: string) {
    // Wait for the save button to be enabled (PDF generation complete)
    // Increased timeout for slower CI runners, especially with image processing
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });

    const actualPath = getActualPDFPath(testName);
    const expectedPath = getExpectedPDFPath(testName);

    // Use page.evaluate to access renderer context and save the PDF directly
    await page.evaluate(async (outputPath) => {
        // Access the previousBlobUrl from the renderer context
        const pdfDataUrl = (window as Window & { previousBlobUrl?: string }).previousBlobUrl ||
                          (document.getElementById('preview-iframe') as HTMLIFrameElement)?.src;

        if (!pdfDataUrl) {
            throw new Error('No PDF data URL found');
        }

        // Fetch the PDF blob and save it
        const response = await fetch(pdfDataUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const fs = require('fs');
        await fs.promises.writeFile(outputPath, buffer);
    }, actualPath);

    console.log(`Saved actual PDF to: ${actualPath}`);

    // If UPDATE_SNAPSHOTS is true, save as expected baseline
    if (UPDATE_SNAPSHOTS) {
        saveExpectedPDF(actualPath, expectedPath);
        console.log(`Updated baseline: ${expectedPath}`);
        return; // Skip comparison when updating
    }

    // Compare with expected PDF
    const { match, difference } = await comparePDFs(
        actualPath,
        expectedPath,
        path.join(path.dirname(actualPath), `${path.basename(actualPath, '.pdf')}-diff.png`),
        1000 // Allow up to 1000 pixels difference to account for minor rendering variations
    );

    expect(match).toBe(true);
    if (!match) {
        throw new Error(
            `PDF comparison failed: ${difference} pixels differ. ` +
            `Expected: ${expectedPath}, Actual: ${actualPath}`
        );
    }
}

test('generates correct PDF for single input', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png');

    await page.waitForSelector('#input-list .list-group-item');

    await savePDFAndCompare(page, 'generates correct PDF for single input');
});

test('generates correct PDF for multiple inputs', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png', 'e2e-tests/inputs/ElectronLogo.png');

    // Wait for all input items to be rendered
    await page.waitForSelector('#input-list .list-group-item');
    await page.waitForFunction(() => {
        const items = document.querySelectorAll('#input-list .list-group-item');
        return items.length === 2;
    });

    await savePDFAndCompare(page, 'generates correct PDF for multiple inputs');
});

test('generates correct PDF after rotating and cropping', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png');
    await page.waitForSelector('#input-list .list-group-item');

    // Wait for initial PDF generation
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });
    console.log('Initial PDF ready');

    // Edit the image
    await page.locator('#btn-input-edit-0').click();
    console.log('Edit dialog opened');
    await page.locator('#btn-input-edit-rotate-ccw').click();
    console.log('Rotated counter-clockwise');
    await page.locator('#btn-input-edit-zoom-in').click();
    await page.locator('#btn-input-edit-zoom-in').click();
    console.log('Zoomed in 2x');
    await page.locator('#btn-input-edit-confirm').click();
    console.log('Confirmed edits, waiting for PDF regeneration');

    // Wait for preview to regenerate - save button will be disabled then re-enabled
    // First wait for it to be disabled (processing started)
    await page.waitForSelector('#save-button[disabled]', { timeout: 5000 }).catch(() => {
        console.log('Save button did not disable (might have been too fast)');
    });
    // Then wait for it to be enabled again (processing complete)
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });
    console.log('PDF regenerated after edits');

    await savePDFAndCompare(page, 'generates correct PDF after rotating and cropping');
});

test('generates correct PDF with fax optimization', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png');

    await page.waitForSelector('#input-list .list-group-item');

    // Enable fax optimization
    await page.locator('#optimize-for-fax').click();
    console.log('Enabled fax optimization');

    // Wait for PDF to be generated with fax optimization
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });
    console.log('PDF generated with fax optimization');

    await savePDFAndCompare(page, 'generates correct PDF with fax optimization');
});

test('generates correct PDF after removing a file', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png', 'e2e-tests/inputs/ElectronLogo.png');

    // Wait for all input items to be rendered
    await page.waitForSelector('#input-list .list-group-item');
    await page.waitForFunction(() => {
        const items = document.querySelectorAll('#input-list .list-group-item');
        return items.length === 2;
    });
    console.log('Both inputs loaded');

    // Wait for initial PDF generation
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });

    // Set up dialog handler to automatically accept the confirmation
    page.on('dialog', dialog => {
        console.log('Accepting confirmation dialog:', dialog.message());
        dialog.accept();
    });

    // Remove the first input (Placeholder.png)
    await page.locator('#btn-input-delete-0').click();
    console.log('Clicked delete button for first file');

    // Wait for single input to remain
    await page.waitForFunction(() => {
        const items = document.querySelectorAll('#input-list .list-group-item');
        return items.length === 1;
    });
    console.log('File removed, one item remains (ElectronLogo.png)');

    // Wait for PDF to regenerate with single input
    await page.waitForSelector('#save-button[disabled]', { timeout: 5000 }).catch(() => {
        console.log('Save button did not disable (might have been too fast)');
    });
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });
    console.log('PDF regenerated with remaining file');

    await savePDFAndCompare(page, 'generates correct PDF after removing a file');
});

test('generates correct PDF after reordering files', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png', 'e2e-tests/inputs/ElectronLogo.png');

    // Wait for all input items to be rendered
    await page.waitForSelector('#input-list .list-group-item');
    await page.waitForFunction(() => {
        const items = document.querySelectorAll('#input-list .list-group-item');
        return items.length === 2;
    });

    // Files are sorted alphabetically on load: ElectronLogo (0), Placeholder (1)
    console.log('Both inputs loaded and alphabetically sorted');

    // Save PDF with initial alphabetically sorted order (ElectronLogo, Placeholder)
    await savePDFAndCompare(page, 'generates correct PDF after reordering files - before');

    // Drag the second item (Placeholder) to the first position using the drag handle
    const firstHandle = page.locator('#input-list .list-group-item .sortable-handle').nth(0);
    const secondHandle = page.locator('#input-list .list-group-item .sortable-handle').nth(1);

    // Get bounding boxes for drag operation
    const firstBox = await firstHandle.boundingBox();
    const secondBox = await secondHandle.boundingBox();

    if (!firstBox || !secondBox) {
        throw new Error('Could not get bounding boxes for drag handles');
    }

    // Perform drag: drag second item's handle (Placeholder) to first position
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2, { steps: 10 });
    await page.mouse.up();
    console.log('Dragged Placeholder to first position using sortable handle');

    // Wait a bit for the drag to complete and UI to update
    await page.waitForTimeout(500);

    // Wait for PDF to regenerate with reordered inputs
    await page.waitForSelector('#save-button[disabled]', { timeout: 5000 }).catch(() => {
        console.log('Save button did not disable (might have been too fast)');
    });
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });
    console.log('PDF regenerated with reordered files (Placeholder, ElectronLogo)');

    // Save PDF with reordered files (Placeholder, ElectronLogo)
    await savePDFAndCompare(page, 'generates correct PDF after reordering files - after');
});

test('generates correct PDF in landscape orientation', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png');

    await page.waitForSelector('#input-list .list-group-item');

    // Set landscape orientation (different from default portrait)
    await page.evaluate(() => {
        const landscapeRadio = document.getElementById('radio-orientation-landscape') as HTMLInputElement;
        const faxCheckbox = document.getElementById('optimize-for-fax') as HTMLInputElement;

        if (!landscapeRadio.checked) {
            landscapeRadio.click();
        }
        if (faxCheckbox.checked) {
            faxCheckbox.click();
        }
    });
    console.log('Set landscape orientation');

    // Wait for PDF to be generated in landscape
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 60000 });
    console.log('PDF generated in landscape orientation');

    await savePDFAndCompare(page, 'generates correct PDF in landscape orientation');
});
