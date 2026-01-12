import { test, expect } from '@playwright/test';
import {
    countryAccounts,
    disasterRecordsTable,
    instanceSystemSettings,
    userCountryAccounts,
    userTable,
    eventTable,
} from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const testEmail = `e2e_${Date.now()}@test.com`;
const userId = randomUUID();
const countryAccountId = randomUUID();
const eventId1 = randomUUID();
const disasterRecordId1 = eventId1;
const eventId2 = randomUUID();
const disasterRecordId2 = eventId2;

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
        await tx.insert(eventTable).values({ id: eventId1 });
        await tx.insert(disasterRecordsTable).values({
            id: disasterRecordId1,
            hipTypeId: '1037',
            countryAccountsId: countryAccountId,
            approvalStatus: 'draft',
            startDate: '2026-01-06',
            endDate: '2026-01-07',
        });
        await tx.insert(eventTable).values({ id: eventId2 });
        await tx.insert(disasterRecordsTable).values({
            id: disasterRecordId2,
            hipTypeId: '1037',
            countryAccountsId: countryAccountId,
            approvalStatus: 'draft',
            startDate: '2026-01-06',
            endDate: '2026-01-07',
        });
    });
});
test.afterAll(async () => {
    await dr.transaction(async (tx) => {
        await tx.delete(disasterRecordsTable).where(eq(disasterRecordsTable.id, disasterRecordId1));
        await tx.delete(eventTable).where(eq(eventTable.id, eventId1));
        await tx.delete(disasterRecordsTable).where(eq(disasterRecordsTable.id, disasterRecordId2));
        await tx.delete(eventTable).where(eq(eventTable.id, eventId2));
        await tx
            .delete(instanceSystemSettings)
            .where(eq(instanceSystemSettings.countryAccountsId, countryAccountId));
        await tx
            .delete(userCountryAccounts)
            .where(eq(userCountryAccounts.countryAccountsId, countryAccountId));
        await tx.delete(countryAccounts).where(eq(countryAccounts.id, countryAccountId));
        await tx.delete(userTable).where(eq(userTable.id, userId));
    });
});

test.describe('List disaster records page', () => {
    test('should successfully show two disaster records in the table when there are only two records of disaster records', async ({
        page,
    }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Password123!');
        await Promise.all([page.waitForURL('**/hazardous-event'), page.click('#login-button')]);

        await page.goto('/en/disaster-record');

        const table = page.getByTestId('list-table');
        await expect(table).toBeVisible();
        await expect(table.locator('tbody tr')).toHaveCount(2);
    });
});
