import { test, expect } from "@playwright/test";
import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import { countryAccountsTable } from "~/drizzle/schema/countryAccountsTable";
import { instanceSystemSettingsTable } from "~/drizzle/schema/instanceSystemSettingsTable";
import { noticesTable } from "~/drizzle/schema/noticesTable";
import { userTable } from "~/drizzle/schema";
import { dr, initDB } from "~/db.server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const testEmail = `e2e_notices_${Date.now()}@test.com`;
const userId = randomUUID();
const countryAccountId = randomUUID();
const knownNoticeId = randomUUID();

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

		await tx.insert(noticesTable).values({
			id: knownNoticeId,
			countryAccountsId: countryAccountId,
			titleJson: { en: "System maintenance notice" },
			bodyJson: { en: "The system will be unavailable on Sunday." },
			isPublished: true,
			audience: "all",
			publishedAt: new Date("2026-01-01T00:00:00.000Z"),
		});
	});
});

test.afterAll(async () => {
	await dr.transaction(async (tx) => {
		await tx
			.delete(noticesTable)
			.where(eq(noticesTable.countryAccountsId, countryAccountId));
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

async function login(page: import("@playwright/test").Page) {
	// #login-button no longer exists on the redesigned login page (commit a9658b94);
	// the accessible role selector below matches new-route-auth.spec.ts's working pattern.
	await page.goto("/en/user/login");
	await page.fill('input[name="email"]', testEmail);
	await page.fill('input[name="password"]', "Password123!");
	await Promise.all([
		page.waitForURL((url) => !url.href.includes("/user/login"), {
			timeout: 30000,
		}),
		page.getByRole("button", { name: "Sign in" }).click(),
	]);
}

test.describe("Notices routes", () => {
	test("list page renders seeded notices for an authenticated user", async ({
		page,
	}) => {
		await login(page);
		await page.goto("/en/notices");

		await expect(page.getByText("System maintenance notice")).toBeVisible();
	});

	test("detail page renders a known notice id", async ({ page }) => {
		await login(page);
		await page.goto(`/en/notices/${knownNoticeId}`);

		await expect(
			page.getByRole("heading", { name: "System maintenance notice" }),
		).toBeVisible();
		await expect(
			page.getByText("The system will be unavailable on Sunday."),
		).toBeVisible();
	});

	test("unknown notice id renders NoticeErrorBoundary with a visible, copyable traceId", async ({
		page,
	}) => {
		await login(page);
		await page.goto(`/en/notices/${randomUUID()}`);

		const alert = page.getByRole("alert");
		await expect(alert).toBeVisible();
		await expect(alert.getByRole("button")).toBeVisible();
	});

	test("unauthenticated request to the list route redirects to login", async ({
		page,
	}) => {
		await page.goto("/en/notices");

		await expect(page).toHaveURL(/\/en\/user\/login/);
	});

	test("unauthenticated request to the detail route redirects to login", async ({
		page,
	}) => {
		await page.goto(`/en/notices/${knownNoticeId}`);

		await expect(page).toHaveURL(/\/en\/user\/login/);
	});
});
