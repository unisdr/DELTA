import { test, expect } from '@playwright/test';
import { countryAccounts, userCountryAccounts, userTable } from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const testEmail = `e2e_${Date.now()}@test.com`;
const userId = '5c2d9f48-0b3e-4a67-8e14-7a1c6f2b9d05';
const countryAccountId = '9f6a3b7e-1c24-4d88-a5e2-3f7c0d1b8a96';

test.beforeAll(async () => {
    initDB();

    const passwordHash = bcrypt.hashSync('Password123!', 10);

    await dr.transaction(async (tx) => {
        await tx.insert(userTable).values({
            id: userId,
            email: testEmail,
            password: passwordHash,
            emailVerified: true,
        });

        await tx.insert(countryAccounts).values({
            id: countryAccountId,
            shortDescription: 'description',
            countryId: 'e34ef71f-0a72-40c4-a6e0-dd19fb26f391',
            status: 1,
            type: 'Training',
        });

        await tx.insert(userCountryAccounts).values({
            userId: userId,
            countryAccountsId: countryAccountId,
            role: 'admin',
            isPrimaryAdmin: true,
        });
    });
});
test.afterAll(async () => {
    await dr
        .delete(userCountryAccounts)
        .where(eq(userCountryAccounts.countryAccountsId, countryAccountId));
    await dr.delete(countryAccounts).where(eq(countryAccounts.id, countryAccountId));
    await dr.delete(userTable).where(eq(userTable.id, userId));
});

test.describe('User login page', () => {
    test('should loads user login page when navigating to /login', async ({ page }) => {
        await page.goto('/en/user/login');

        await expect(page).toHaveTitle(/Sign-in/i);
        await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('#login-button')).toBeVisible();
    });
    test('should shows error on invalid credentials', async ({ page }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', 'wrong@test.com');
        await page.fill('input[name="password"]', 'wrongpassword');

        await page.click('#login-button');

        await expect(page.getByText(/email or password do not match/i)).toBeVisible();
    });
    test('should redirect to hazardous event page when successful credential and user has only one country instance associated to it.', async ({
        page,
    }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Password123!');
        await page.click('#login-button');

        await expect(page).toHaveURL('/en/hazardous-event');
    });
});
