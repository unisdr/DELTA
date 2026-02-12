import { test, expect } from "@playwright/test";
import { userCountryAccounts } from "~/drizzle/schema/userCountryAccounts";
import { countryAccounts } from "~/drizzle/schema/countryAccounts";
import { instanceSystemSettingsTable } from "~/drizzle/schema/instanceSystemSettingsTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { userTable } from "~/drizzle/schema";
import { dr, initDB } from "~/db.server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const testEmail = `e2e_${Date.now()}@test.com`;
const userId = randomUUID();
const countryAccountId = randomUUID();
const disasterRecordId = "a7b4a2d1-6f98-4c3e-8b72-1a9f5d0c6e11";

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
		await tx.insert(disasterRecordsTable).values({
			id: disasterRecordId,
			hipTypeId: "1037",
			countryAccountsId: countryAccountId,
			approvalStatus: "draft",
			startDate: "2026-01-06",
			endDate: "2026-01-07",
			primaryDataSource: "1",
			originatorRecorderInst: "1",
			validatedBy: "1",
			legacyData: [null],
			spatialFootprint: [],
			attachments: [],
		});
	});
});
test.afterAll(async () => {
	await dr.transaction(async (tx) => {
		await tx.delete(disasterRecordsTable).where(eq(disasterRecordsTable.id, disasterRecordId));
		await tx
			.delete(instanceSystemSettingsTable)
			.where(eq(instanceSystemSettingsTable.countryAccountsId, countryAccountId));
		await tx
			.delete(userCountryAccounts)
			.where(eq(userCountryAccounts.countryAccountsId, countryAccountId));
		await tx.delete(countryAccounts).where(eq(countryAccounts.id, countryAccountId));
		await tx.delete(userTable).where(eq(userTable.id, userId));
	});
});

test.describe("Delete Disaster record", () => {
	test("should successfully delete draft disasater record when click on delete icon on a record table.", async ({
		page,
	}) => {
		page.on("pageerror", (err) => {
			console.error("PAGE ERROR:", err.message);
		});

		page.on("console", (msg) => {
			if (msg.type() === "error") {
				console.error("CONSOLE ERROR:", msg.text());
			}
		});
		await page.goto("/en/user/login");
		await page.fill('input[name="email"]', testEmail);
		await page.fill('input[name="password"]', "Password123!");
		await Promise.all([page.waitForURL("**/hazardous-event"), page.click("#login-button")]);

		await page.goto("/en/disaster-record");
		await page.getByRole("row", { name: "a7b4a" }).getByLabel("Delete").click();
		await page.getByRole("button", { name: "Delete permanently" }).click();
		await expect(page.getByRole("row", { name: "a7b4a" })).not.toBeVisible();
	});
});
