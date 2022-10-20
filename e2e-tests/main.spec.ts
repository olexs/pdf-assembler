import {expect, test} from '@playwright/test'
import {
    ElectronAppInfo,
    findLatestBuild,
    parseElectronApp,
} from 'electron-playwright-helpers'
import {ElectronApplication, Page, _electron as electron} from 'playwright'

let electronApp: ElectronApplication;
let appInfo: ElectronAppInfo;

test.beforeAll(async () => {
    // find the latest build in the out directory
    const latestBuild = findLatestBuild();
    // parse the directory and find paths and other info
    appInfo = parseElectronApp(latestBuild);
    // set the CI environment variable to true
    process.env.CI = 'e2e';
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

test('renders a single input preview after launch', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png');

    await page.waitForSelector('#input-list .list-group-item');

    await expect(page.locator('#input-list')).toHaveScreenshot();
});

test('renders multiple input previews after launch', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png', 'e2e-tests/inputs/ElectronLogo.png');

    await page.waitForSelector('#input-list .list-group-item');

    await expect(page.locator('#input-list')).toHaveScreenshot();
});

test('allows to rotate and crop the image and renders the preview after changes', async () => {
    const page = await launchApp('e2e-tests/inputs/Placeholder.png');
    await page.waitForSelector('#input-list .list-group-item');

    await page.locator('#btn-input-edit-0').click();

    await page.locator('#btn-input-edit-rotate-ccw').click();
    await page.locator('#btn-input-edit-zoom-in').click();
    await page.locator('#btn-input-edit-zoom-in').click();
    await page.locator('#btn-input-edit-confirm').click();

    await expect(page.locator('#input-list')).toHaveScreenshot();
});