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
const userId = 'd3c1f0b9-2a6d-4f1a-9f6c-8d4e2a7b91f4';
const countryAccountId = 'c7b4a2d1-6f98-4c3e-8b72-1a9f5d0c6e85';
const eventId = 'f7b4a2d1-6f98-4c3e-8b72-1a9f5d0c6e11';
const hazardousEventId = eventId;

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

        await tx.insert(instanceSystemSettings).values({
            countryAccountsId: countryAccountId,
            approvedRecordsArePublic: true,
        });
        await tx.insert(eventTable).values({ id: eventId });
        await tx.insert(hazardousEventTable).values({
            id: hazardousEventId,
            hipTypeId: '1037',
            countryAccountsId: countryAccountId,
            approvalStatus: 'draft',
            startDate: '2026-01-06',
            endDate: '2026-01-07',
            recordOriginator: '1',
        });
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

test.describe('Delete Hazardous event', () => {
    test('should successfully delete draft hazardous event when click on delete icon on a record table.', async ({
        page,
    }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Password123!');
        page.click('#login-button');

        await page.getByRole('row', { name: 'f7b4a' }).getByLabel('Delete').click();
        page.getByRole('button', { name: 'Delete permanently' }).click();
        await expect(page.getByRole('row', { name: 'f7b4a' })).not.toBeVisible();
    });
});
