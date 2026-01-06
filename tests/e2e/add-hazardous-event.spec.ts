import { test, expect } from '@playwright/test';
import {
    countryAccounts,
    hazardousEventTable,
    instanceSystemSettings,
    userCountryAccounts,
    userTable,
} from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const testEmail = `e2e_${Date.now()}@test.com`;
const userId = 'a3c1f0b9-2a6d-4f1a-9f6c-8d4e2a7b91f3';
const countryAccountId = 'e7b4a2d1-6f98-4c3e-8b72-1a9f5d0c6e84';

test.beforeAll(async () => {
    initDB();

    const passwordHash = bcrypt.hashSync('Password123!', 10);

    await dr.insert(userTable).values({
        id: userId,
        email: testEmail,
        password: passwordHash,
        emailVerified: true,
    });

    await dr.insert(countryAccounts).values({
        id: countryAccountId,
        shortDescription: 'description',
        countryId: 'e34ef71f-0a72-40c4-a6e0-dd19fb26f391',
        status: 1,
        type: 'Training',
    });

    await dr.insert(userCountryAccounts).values({
        userId: userId,
        countryAccountsId: countryAccountId,
        role: 'admin',
        isPrimaryAdmin: true,
    });

    await dr.insert(instanceSystemSettings).values({
        countryAccountsId: countryAccountId,
        approvedRecordsArePublic: true,
    });
});
test.afterAll(async () => {
    await dr
        .delete(hazardousEventTable)
        .where(eq(hazardousEventTable.countryAccountsId, countryAccountId));
    await dr
        .delete(instanceSystemSettings)
        .where(eq(instanceSystemSettings.countryAccountsId, countryAccountId));
    await dr
        .delete(userCountryAccounts)
        .where(eq(userCountryAccounts.countryAccountsId, countryAccountId));
    await dr.delete(countryAccounts).where(eq(countryAccounts.id, countryAccountId));
    await dr.delete(userTable).where(eq(userTable.id, userId));
});

test.describe('Add Hazardous event page', () => {
    test('should add new hazardous event when filling all required fields', async ({ page }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Password123!');

        page.click('#login-button');

        await page.getByRole('button', { name: 'Add new event' }).click();

        // Wait for the form element specifically
        await page.waitForSelector('select[name="hipTypeId"]', {
            state: 'visible',
            timeout: 3000,
        });

        await page.locator('select[name="hipTypeId"]').selectOption('1037');
        await page.fill('#startDate', '2025-01-15');
        await page.fill('#endDate', '2025-01-16');
        await page.fill('input[name="recordOriginator"]', '1');

        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Type: Biological')).toBeVisible();
    });
});
