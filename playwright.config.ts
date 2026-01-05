import { config } from 'dotenv';
import { defineConfig } from '@playwright/test';

config({ path: '.env.test' });

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    use: {
        baseURL: 'http://localhost:4000',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: {
        command: 'cross-env NODE_ENV=test yarn dev',
        port: 4000,
    },
});
