import { test, expect } from "@playwright/test";
import { userCountryAccounts } from "~/drizzle/schema/userCountryAccounts";
import { countryAccounts } from "~/drizzle/schema/countryAccounts";
import { instanceSystemSettingsTable } from "~/drizzle/schema/instanceSystemSettingsTable";
import { userTable } from "~/drizzle/schema";
import { dr, initDB } from "~/db.server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const testEmail = `e2e_${Date.now()}@test.com`;
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

		await tx.insert(countryAccounts).values({
			id: countryAccountId,
			shortDescription: "description",
			countryId: "e34ef71f-0a72-40c4-a6e0-dd19fb26f391",
			status: 1,
			type: "Training",
		});

		await tx.insert(userCountryAccounts).values({
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
			.delete(userCountryAccounts)
			.where(eq(userCountryAccounts.countryAccountsId, countryAccountId));
		await tx
			.delete(countryAccounts)
			.where(eq(countryAccounts.id, countryAccountId));
		await tx.delete(userTable).where(eq(userTable.id, userId));
	});
});

test.describe("User login page", () => {
	test("should loads user login page when navigating to /login", async ({
		page,
	}) => {
		await page.goto("/en/user/login");

		await expect(page).toHaveTitle(/Sign-in/i);
		await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator("#login-button")).toBeVisible();
	});
	test("should shows error on invalid credentials", async ({ page }) => {
		await page.goto("/en/user/login");

		await page.fill('input[name="email"]', "wrong@test.com");
		await page.fill('input[name="password"]', "wrongpassword");

		await page.click("#login-button");

		await expect(
			page.getByText(/email or password do not match/i),
		).toBeVisible();
	});
	test("should redirect to hazardous event page when successful credential and user has only one country instance associated to it.", async ({
		page,
	}) => {
		await page.goto("/en/user/login");

		await page.fill('input[name="email"]', testEmail);
		await page.fill('input[name="password"]', "Password123!");

		await Promise.all([
			page.waitForURL("**/hazardous-event"),
			page.click("#login-button"),
		]);

		await expect(page).toHaveURL("/en/hazardous-event");
	});
});
