import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
    testDir: './e2e-tests',
    // Retry tests up to 3 times in CI due to occasional Electron crashes
    retries: process.env.CI ? 3 : 0,
    // Increase timeout for Windows CI with ImageMagick processing
    timeout: 90000, // 90 seconds (up from 30s default)
}

export default config