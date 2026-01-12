import { test, expect } from '@playwright/test';
import {
    countryAccounts,
    eventTable,
    disasterEventTable,
    instanceSystemSettings,
    userCountryAccounts,
    userTable,
} from '~/drizzle/schema';
import { dr, initDB } from '~/db.server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const testEmail = `e2e_${Date.now()}@test.com`;
const userId = randomUUID();
const countryAccountId = randomUUID();
const eventId = randomUUID();
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
        await tx.insert(disasterEventTable).values({
            id: hazardousEventId,
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
        await tx.delete(disasterEventTable).where(eq(disasterEventTable.id, hazardousEventId));
        await tx.delete(eventTable).where(eq(eventTable.id, eventId));
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

test.describe('Edit Disaster event page', () => {
    test('should successfully edit approval status when changing from draft to Waiting for validation', async ({
        page,
    }) => {
        await page.goto('/en/user/login');

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Password123!');
        await Promise.all([page.waitForURL('**/hazardous-event'), page.click('#login-button')]);

        await page.goto('/en/disaster-event');
        await page.getByRole('row', { name: 'Draft' }).getByLabel('Edit').click();
        await page.waitForLoadState('networkidle');
        await page.locator('select[name="approvalStatus"]').selectOption('waiting-for-validation');
        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Record Status: Waiting for validation')).toBeVisible();
    });
});
