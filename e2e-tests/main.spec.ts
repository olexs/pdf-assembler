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

// Environment variable to update baselines: UPDATE_SNAPSHOTS=true npm run e2e
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === 'true';

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
    electronApp = await electron.launch({
        args: [appInfo.main, ...args],
        executablePath: appInfo.executable
    });
    electronApp.on('window', async (page) => {
        const filename = page.url()?.split('/').pop();
        console.log(`Window opened: ${filename}`);

        // capture errors
        page.on('pageerror', (error) => {
            console.error(error);
        });
        // capture console messages
        page.on('console', (msg) => {
            console.log(msg.text());
        });
    });

    return electronApp.firstWindow();
}

test.afterEach(async () => {
    await electronApp.close();
});

/**
 * Helper function to save PDF and compare with baseline
 */
async function savePDFAndCompare(page: Page, testName: string) {
    // Wait for the save button to be enabled (PDF generation complete)
    await page.waitForSelector('#save-button:not([disabled])', { timeout: 30000 });

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

    // Edit the image
    await page.locator('#btn-input-edit-0').click();
    await page.locator('#btn-input-edit-rotate-ccw').click();
    await page.locator('#btn-input-edit-zoom-in').click();
    await page.locator('#btn-input-edit-zoom-in').click();
    await page.locator('#btn-input-edit-confirm').click();

    // Wait for preview to regenerate
    await page.waitForTimeout(1000);

    await savePDFAndCompare(page, 'generates correct PDF after rotating and cropping');
});
