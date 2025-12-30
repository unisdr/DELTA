import { test, expect } from '@playwright/test';

test.describe('User login page', () => {
    test('loads user login page', async ({ page }) => {
        await page.goto('/login');

        await expect(page).toHaveTitle(/Sign-in/i);
        await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('#login-button')).toBeVisible();
    });
});
