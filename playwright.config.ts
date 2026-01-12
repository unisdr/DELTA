import { config } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

config({ path: '.env.test' });

export default defineConfig({
    testDir: './tests/e2e',
    //Each test is given 60 seconds.
    timeout: 60_000,
    workers: 1,

    use: {
        baseURL: 'http://localhost:4000',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: {
        command: 'yarn dev',
        port: 4000,
    },
    projects: [
        {
            name: 'setup db',
            testMatch: /global\.setup\.ts/,
            teardown: 'cleanup db',
        },
        {
            name: 'cleanup db',
            testMatch: /global\.teardown\.ts/,
        },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup db'],
        },
    ],
});
