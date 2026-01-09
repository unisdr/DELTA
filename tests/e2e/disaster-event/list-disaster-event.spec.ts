import { test, expect } from '@playwright/test';
import {
    countryAccounts,
    instanceSystemSettings,
    userCountryAccounts,
    userTable,
} from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { disasterEventTable, eventTable } from '~/drizzle/schema';

const testEmail = `e2e_${Date.now()}@test.com`;
const userId = randomUUID();
const countryAccountId = randomUUID();
const eventId1 = randomUUID();
const disasterEventId1 = eventId1;
const eventId2 = randomUUID();
const disasterEventId2 = eventId2;

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
        await tx.insert(disasterEventTable).values({
            id: disasterEventId1,
            hipTypeId: '1037',
            countryAccountsId: countryAccountId,
            approvalStatus: 'draft',
            startDate: '2026-01-06',
            endDate: '2026-01-07',
        });
        await tx.insert(eventTable).values({ id: eventId2 });
        await tx.insert(disasterEventTable).values({
            id: disasterEventId2,
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
        await tx.delete(disasterEventTable).where(eq(disasterEventTable.id, disasterEventId1));
        await tx.delete(eventTable).where(eq(eventTable.id, eventId1));
        await tx.delete(disasterEventTable).where(eq(disasterEventTable.id, disasterEventId2));
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

test.describe('List disaster event page', () => {
    test('should successfully show two disaster events in the table when there are only two records of disaster events', async ({
        page,
    }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Password123!');
        await Promise.all([page.waitForURL('**/hazardous-event'), page.click('#login-button')]);

        await page.goto('/en/disaster-event');

        const table = page.getByTestId('list-table');
        await expect(table).toBeVisible();
        await expect(table.locator('tbody tr')).toHaveCount(2);
    });
});
