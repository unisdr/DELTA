import { vi } from "vitest";
import { dr } from "~/db.server";
import { countryAccounts } from "~/drizzle/schema/countryAccounts";
import { userTable } from "~/drizzle/schema";
import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import { instanceSystemSettingsTable } from "~/drizzle/schema/instanceSystemSettingsTable";
import { countriesTable } from "~/drizzle/schema/countriesTable";
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
		countryId: randomUUID(),
	};
}

export function setupSessionMocks() {
	vi.mock("~/utils/session", () => ({
		getCountryAccountsIdFromSession: vi.fn(),
		getCountrySettingsFromSession: vi.fn(),
		getUserFromSession: vi.fn(),
		getUserRoleFromSession: vi.fn(),
		redirectWithMessage: vi.fn(
			(_args: any, url: string, _message: any) =>
				new Response(null, { status: 302, headers: { Location: url } }),
		),
		getSuperAdminSession: vi.fn().mockResolvedValue(null),
	}));

	vi.mock("~/utils/auth", async (importOriginal) => {
		const original = await importOriginal<any>();
		return {
			...original,
			requireUser: vi.fn(),
			authLoaderWithPerm: vi.fn((_permission: string, fn: Function) => {
				return async (args: any) => fn(args);
			}),
			authLoaderPublicOrWithPerm: vi.fn((_permission: string, fn: Function) => {
				return async (args: any) => {
					return fn(args);
				};
			}),
			authActionWithPerm: vi.fn((_permission: string, fn: Function) => {
				return async (args: any) => {
					const { requireUser } = await import("~/utils/auth");
					const userSession = await (requireUser as any)(args);
					return fn({ ...args, userSession });
				};
			}),
		};
	});

	vi.mock("~/backend.server/models/auditLogs", () => ({
		logAudit: vi.fn().mockResolvedValue({ record: {} }),
	}));
}

export async function createTestUser(ids: {
	userId: string;
	countryAccountId: string;
	userEmail: string;
	countryId: string;
}) {
	await cleanupTestUser(ids);
	const passwordHash = bcrypt.hashSync("Password123!", 10);
	await dr.transaction(async (tx) => {
		await tx
			.insert(userTable)
			.values({
				id: ids.userId,
				email: ids.userEmail,
				password: passwordHash,
				emailVerified: true,
			})
			.onConflictDoNothing();

		await tx
			.insert(countriesTable)
			.values({
				id: ids.countryId,
				name: `Test Country ${ids.countryId.slice(0, 8)}`,
			})
			.onConflictDoNothing();

		await tx
			.insert(countryAccounts)
			.values({
				id: ids.countryAccountId,
				shortDescription: "Test Country",
				countryId: ids.countryId,
				status: 1,
				type: "Training",
			})
			.onConflictDoNothing();

		await tx
			.insert(userCountryAccountsTable)
			.values({
				userId: ids.userId,
				countryAccountsId: ids.countryAccountId,
				role: "admin",
				isPrimaryAdmin: true,
			})
			.onConflictDoNothing();

		await tx
			.insert(instanceSystemSettingsTable)
			.values({
				countryAccountsId: ids.countryAccountId,
				approvedRecordsArePublic: true,
			})
			.onConflictDoNothing();
	});
}

export async function cleanupTestUser(ids: {
	userId: string;
	countryAccountId: string;
	countryId?: string;
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
	if (ids.countryId) {
		try {
			await dr
				.delete(countriesTable)
				.where(eq(countriesTable.id, ids.countryId));
		} catch (e) {}
	}
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

	const { requireUser } = await import("~/utils/auth");

	vi.mocked(getCountryAccountsIdFromSession).mockImplementation(async () => {
		return ids.countryAccountId;
	});
	vi.mocked(getCountrySettingsFromSession).mockResolvedValue({
		approvedRecordsArePublic: false,
		dtsInstanceCtryIso3: "USA",
		currencyCode: "USD",
		websiteName: "DELTA Resilience",
	} as any);
	vi.mocked(getUserFromSession).mockResolvedValue({
		user: { id: ids.userId, emailVerified: true, totpEnabled: false },
		sessionId: "test-session-id",
		session: { totpAuthed: true },
	} as any);
	vi.mocked(getUserRoleFromSession).mockResolvedValue("admin");
	vi.mocked(requireUser).mockResolvedValue({
		user: { id: ids.userId, emailVerified: true, totpEnabled: false },
		sessionId: "test-session-id",
		session: { totpAuthed: true },
	} as any);
}
