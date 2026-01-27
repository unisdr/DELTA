import { test, expect } from '@playwright/test';

import {
    countryAccounts,
    disasterEventTable,
    eventTable,
    instanceSystemSettings,
    userCountryAccounts,
    userTable,
} from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const countryAccountId = randomUUID();

const testEmail = `e2e_${Date.now()}@test.com`;
test.beforeAll(async () => {
    initDB();
    const userId = randomUUID();
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

        await tx.insert(instanceSystemSettings).values({
            countryAccountsId: countryAccountId,
            approvedRecordsArePublic: true,
        });
    });
});
test.afterAll(async () => {
    await dr.transaction(async (tx) => {
        const records = await tx
            .select({ id: disasterEventTable.id })
            .from(disasterEventTable)
            .where(eq(disasterEventTable.countryAccountsId, countryAccountId))
            .limit(1);

        const id = records[0]?.id;
        await tx.delete(disasterEventTable).where(eq(disasterEventTable.id, id));
        await tx.delete(eventTable).where(eq(eventTable.id, id));
        await tx
            .delete(instanceSystemSettings)
            .where(eq(instanceSystemSettings.countryAccountsId, countryAccountId));
        await tx
            .delete(userCountryAccounts)
            .where(eq(userCountryAccounts.countryAccountsId, countryAccountId));
        await tx.delete(countryAccounts).where(eq(countryAccounts.id, countryAccountId));
        await tx.delete(userTable).where(eq(userTable.email, testEmail));
    });
});

test.describe('Add disaster event page', () => {
    test('should add new disaster event when filling all required fields', async ({ page }) => {
        await page.goto('/en/user/login');

        await page.getByPlaceholder('*Email address').fill(testEmail);
        await page
            .getByRole('textbox', { name: 'Toggle password visibility' })
            .fill('Password123!');
        await Promise.all([
            page.waitForURL('**/hazardous-event'),
            page.getByRole('button', { name: 'Sign in' }).click(),
        ]);
        await page.goto('/en/disaster-event');
        await page.getByRole('button', { name: 'Add new event' }).click();
        await page.waitForURL('/en/disaster-event/edit/new');
        const hipTypeSelect = page.locator('select[name="hipTypeId"]');
        await expect(hipTypeSelect).toBeVisible({ timeout: 10000 });
        await hipTypeSelect.selectOption('1037');
        await page.getByRole('textbox', { name: 'Start date Date' }).fill('2026-01-15');
        await page.getByRole('textbox', { name: 'End date Date' }).fill('2026-01-16');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Type: Biological')).toBeVisible();
    });
});
