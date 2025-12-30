import { test, expect } from '@playwright/test';

test.describe('User login page', () => {
    test('should loads user login page when navigating to /login', async ({ page }) => {
        await page.goto('/login');

        await expect(page).toHaveTitle(/Sign-in/i);
        await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('#login-button')).toBeVisible();
    });
    test('should shows error on invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.fill('input[name="email"]', 'wrong@test.com');
        await page.fill('input[name="password"]', 'wrongpassword');

        await page.click('#login-button');

        await expect(page.getByText(/email or password do not match/i)).toBeVisible();
    });
});
