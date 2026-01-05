import { test, expect } from '@playwright/test';
import { countryAccounts, userCountryAccounts, userTable } from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';

test.beforeAll(async () => {
    initDB();

    const passwordHash = bcrypt.hashSync('Password123!', 10);

    const [user] = await dr
        .insert(userTable)
        .values({
            email: 'e2e@test.com',
            password: passwordHash,
            emailVerified: true,
        })
        .returning({ id: userTable.id });

    const [InsertedcountryAccounts] = await dr
        .insert(countryAccounts)
        .values({
            shortDescription: 'description',
            countryId: '704e8850-d5e2-422c-956c-bce5312ab266',
            status: 1,
            type: 'Training',
        })
        .returning({ id: countryAccounts.id });

    await dr.insert(userCountryAccounts).values({
        userId: user.id,
        countryAccountsId: InsertedcountryAccounts.id,
        role: 'admin',
        isPrimaryAdmin: true,
    });
});
test.afterAll(async () => {
    await dr.delete(userCountryAccounts);
    await dr.delete(countryAccounts);
    await dr.delete(userTable);
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

        await page.fill('input[name="email"]', 'e2e@test.com');
        await page.fill('input[name="password"]', 'Password123!');

        await page.click('#login-button');

        await expect(page).toHaveURL('/en/hazardous-event');
    });
});
