import { test, expect } from '@playwright/test';
import {
    countryAccounts,
    eventTable,
    hazardousEventTable,
    instanceSystemSettings,
    userCountryAccounts,
    userTable,
} from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const testEmail = `e2e_${Date.now()}@test.com`;
const userId = 'b3c1f0b9-2a6d-4f1a-9f6c-8d4e2a7b91f4';
const countryAccountId = 'a7b4a2d1-6f98-4c3e-8b72-1a9f5d0c6e85';
const eventId = 'd7b4a2d1-6f98-4c3e-8b72-1a9f5d0c6e11';
const hazardousEventId = eventId;

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
    await dr.insert(eventTable).values({ id: eventId });
    await dr.insert(hazardousEventTable).values({
        id: hazardousEventId,
        hipTypeId: '1037',
        countryAccountsId: countryAccountId,
        approvalStatus: 'draft',
        startDate: '2026-01-06',
        endDate: '2026-01-07',
        recordOriginator: '1',
    });
});
test.afterAll(async () => {
    await dr.delete(hazardousEventTable).where(eq(hazardousEventTable.id, hazardousEventId));
    await dr.delete(eventTable).where(eq(eventTable.id, eventId));
    await dr
        .delete(instanceSystemSettings)
        .where(eq(instanceSystemSettings.countryAccountsId, countryAccountId));
    await dr
        .delete(userCountryAccounts)
        .where(eq(userCountryAccounts.countryAccountsId, countryAccountId));
    await dr.delete(countryAccounts).where(eq(countryAccounts.id, countryAccountId));
    await dr.delete(userTable).where(eq(userTable.id, userId));
});

test.describe('Edit Hazardous event page', () => {
    test('should successfully edit approval status when changing from draft to Waiting for validation', async ({
        page,
    }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Password123!');

        page.click('#login-button');

        await page.getByRole('row', { name: 'Biological Draft' }).getByLabel('Edit').click();
        await page.locator('select[name="approvalStatus"]').selectOption('waiting-for-validation');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Record Status: Waiting for validation')).toBeVisible();
    });
});
