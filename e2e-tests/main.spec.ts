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

test('renders the main layout', async () => {
    const page = await launchApp('e2e-tests/input/Placeholder.png');
    await page.waitForSelector('#preview-iframe');

    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));

    await expect(page.locator('#preview-iframe')).toHaveScreenshot();
});

