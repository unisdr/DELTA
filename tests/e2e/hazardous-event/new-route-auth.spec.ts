import { test, expect } from "@playwright/test";

import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import { countryAccountsTable } from "~/drizzle/schema/countryAccountsTable";
import { instanceSystemSettingsTable } from "~/drizzle/schema/instanceSystemSettingsTable";
import { userTable } from "~/drizzle/schema";
import { dr, initDB } from "~/db.server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const testEmail = `e2e_layout_auth_${Date.now()}@test.com`;
const userId = randomUUID();
const countryAccountId = randomUUID();

test.beforeAll(async () => {
	initDB();
	const passwordHash = bcrypt.hashSync("Password123!", 10);

	await dr.transaction(async (tx) => {
		await tx.insert(userTable).values({
			id: userId,
			email: testEmail,
			password: passwordHash,
			emailVerified: true,
		});

		await tx.insert(countryAccountsTable).values({
			id: countryAccountId,
			shortDescription: "description",
			countryId: "e34ef71f-0a72-40c4-a6e0-dd19fb26f391",
			status: 1,
			type: "Training",
		});

		await tx.insert(userCountryAccountsTable).values({
			userId: userId,
			countryAccountsId: countryAccountId,
			role: "admin",
			isPrimaryAdmin: true,
		});

		await tx.insert(instanceSystemSettingsTable).values({
			countryAccountsId: countryAccountId,
			approvedRecordsArePublic: true,
		});
	});
});

test.afterAll(async () => {
	await dr.transaction(async (tx) => {
		await tx
			.delete(instanceSystemSettingsTable)
			.where(
				eq(instanceSystemSettingsTable.countryAccountsId, countryAccountId),
			);
		await tx
			.delete(userCountryAccountsTable)
			.where(eq(userCountryAccountsTable.countryAccountsId, countryAccountId));
		await tx
			.delete(countryAccountsTable)
			.where(eq(countryAccountsTable.id, countryAccountId));
		await tx.delete(userTable).where(eq(userTable.id, userId));
	});
});

test.describe("hazardous-event/new — _authenticated layout route", () => {
	test("unauthenticated request redirects to login with redirectTo param", async ({
		page,
	}) => {
		// Each Playwright test gets a fresh browser context with no cookies, so
		// this page has no session. The _authenticated layout + requireUser in the
		// route loader must both redirect to login.
		await page.goto("/en/hazardous-event/new");

		await expect(page).toHaveURL(/\/en\/user\/login/);
		expect(page.url()).toContain("redirectTo");
		expect(page.url()).toContain("hazardous-event");
	});

	test("authenticated admin can load the new hazardous event form without errors", async ({
		page,
	}) => {
		await page.goto("/en/user/login");
		await page.fill('input[name="email"]', testEmail);
		await page.fill('input[name="password"]', "Password123!");

		// Wait for any navigation away from the login page — the app may redirect
		// to /hazardous-event or /user/select-instance depending on instance count.
		// We care only that login succeeded, then navigate directly to the target.
		await Promise.all([
			page.waitForURL((url) => !url.href.includes("/user/login"), {
				timeout: 30000,
			}),
			page.getByRole("button", { name: "Sign in" }).click(),
		]);

		await page.goto("/en/hazardous-event/new");

		// The hazard-type selector is the first required field rendered by the
		// form — its visibility confirms the route loaded without hitting an error
		// boundary (the regression we saw when userSession was missing from args).
		await page.waitForSelector('select[name="hipTypeId"]', {
			state: "visible",
			timeout: 10000,
		});
		await expect(page.locator('select[name="hipTypeId"]')).toBeVisible();
	});
});
