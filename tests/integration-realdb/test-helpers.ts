import { vi } from "vitest";
import { dr } from "~/db.server";
import { countryAccounts } from "~/drizzle/schema/countryAccounts";
import { userTable } from "~/drizzle/schema";
import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import { instanceSystemSettingsTable } from "~/drizzle/schema/instanceSystemSettingsTable";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const TEST_BASE_URL =
	process.env.TEST_BASE_URL || "http://localhost:3000";

export function createTestIds() {
	return {
		userId: randomUUID(),
		countryAccountId: randomUUID(),
		userEmail: `test_${Date.now()}@example.com`,
		countryId: "3e8cc2da-7ac4-43ff-953c-867976c3f5e0",
	};
}

export function setupSessionMocks() {
	vi.mock("~/utils/session", () => ({
		getCountryAccountsIdFromSession: vi.fn(),
		getCountrySettingsFromSession: vi.fn(),
		getUserFromSession: vi.fn(),
		getUserRoleFromSession: vi.fn(),
	}));

	vi.mock("~/utils/auth", async (importOriginal) => {
		const original = await importOriginal<any>();
		return {
			...original,
			requireUser: vi.fn(),
			authLoaderWithPerm: vi.fn((_permission: string, fn: Function) => fn),
		};
	});
}

export async function createTestUser(ids: {
	userId: string;
	countryAccountId: string;
	userEmail: string;
	countryId: string;
}) {
	const passwordHash = bcrypt.hashSync("Password123!", 10);
	await dr.insert(userTable).values({
		id: ids.userId,
		email: ids.userEmail,
		password: passwordHash,
		emailVerified: true,
	});

	await dr.insert(countryAccounts).values({
		id: ids.countryAccountId,
		shortDescription: "Test Country",
		countryId: ids.countryId,
		status: 1,
		type: "Training",
	});

	await dr.insert(userCountryAccountsTable).values({
		userId: ids.userId,
		countryAccountsId: ids.countryAccountId,
		role: "admin",
		isPrimaryAdmin: true,
	});

	await dr.insert(instanceSystemSettingsTable).values({
		countryAccountsId: ids.countryAccountId,
		approvedRecordsArePublic: true,
	});
}

export async function cleanupTestUser(ids: {
	userId: string;
	countryAccountId: string;
}) {
	try {
		await dr
			.delete(userCountryAccountsTable)
			.where(eq(userCountryAccountsTable.userId, ids.userId));
	} catch (e) {}
	try {
		await dr
			.delete(instanceSystemSettingsTable)
			.where(
				eq(instanceSystemSettingsTable.countryAccountsId, ids.countryAccountId),
			);
	} catch (e) {}
	try {
		await dr
			.delete(countryAccounts)
			.where(eq(countryAccounts.id, ids.countryAccountId));
	} catch (e) {}
	try {
		await dr.delete(userTable).where(eq(userTable.id, ids.userId));
	} catch (e) {}
}

export async function mockSessionValues(ids: {
	countryAccountId: string;
	userId: string;
}) {
	const {
		getCountryAccountsIdFromSession,
		getCountrySettingsFromSession,
		getUserFromSession,
		getUserRoleFromSession,
	} = await import("~/utils/session");

	vi.mocked(getCountryAccountsIdFromSession).mockResolvedValue(
		ids.countryAccountId,
	);
	vi.mocked(getCountrySettingsFromSession).mockResolvedValue({
		approvedRecordsArePublic: false,
	} as any);
	vi.mocked(getUserFromSession).mockResolvedValue({
		user: { id: ids.userId, emailVerified: true, totpEnabled: false },
		sessionId: "test-session-id",
		session: { totpAuthed: true },
	} as any);
	vi.mocked(getUserRoleFromSession).mockResolvedValue("admin");
}
