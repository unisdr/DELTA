import { test } from '@playwright/test';

test('login and save session', async ({ page }) => {
    // 1️⃣ Go to login page
    await page.goto('/login');

    // 2️⃣ Fill login form
    await page.fill('input[name="email"]', 'e2e2@test.com');
    await page.fill('input[name="password"]', 'Password123!');

    // 3️⃣ Click login AND wait for redirect
    await Promise.all([
        page.waitForURL(/\/en\//), // wait until logged in
        page.click('#login-button'),
    ]);

    // 4️⃣ Save auth state (cookies, storage)
    await page.context().storageState({
        path: 'playwright/.auth/user.json',
    });
});
