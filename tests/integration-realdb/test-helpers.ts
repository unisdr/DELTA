import { vi } from "vitest";
import { dr } from "~/db.server";
import { countryAccountsTable } from "~/drizzle/schema/countryAccountsTable";
import { userTable } from "~/drizzle/schema";
import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import { instanceSystemSettingsTable } from "~/drizzle/schema/instanceSystemSettingsTable";
import { countriesTable } from "~/drizzle/schema/countriesTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { lossesTable } from "~/drizzle/schema/lossesTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";
import { assetTable } from "~/drizzle/schema/assetTable";
import { humanDsgTable } from "~/drizzle/schema/humanDsgTable";
import { humanCategoryPresenceTable } from "~/drizzle/schema/humanCategoryPresenceTable";
import { deathsTable } from "~/drizzle/schema/deathsTable";
import { injuredTable } from "~/drizzle/schema/injuredTable";
import { missingTable } from "~/drizzle/schema/missingTable";
import { affectedTable } from "~/drizzle/schema/affectedTable";
import { displacedTable } from "~/drizzle/schema/displacedTable";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
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
		getUserIdFromSession: vi.fn(),
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
			optionalUser: vi.fn(),
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
			.insert(countryAccountsTable)
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

export async function cleanupTestDataByCountryAccount(
	countryAccountId: string,
) {
	const records = await dr
		.select({ id: disasterRecordsTable.id })
		.from(disasterRecordsTable)
		.where(eq(disasterRecordsTable.countryAccountsId, countryAccountId));

	if (records.length > 0) {
		const recordIds = records.map((r) => r.id);

		const dsgRecords = await dr
			.select({ id: humanDsgTable.id })
			.from(humanDsgTable)
			.where(inArray(humanDsgTable.recordId, recordIds));

		if (dsgRecords.length > 0) {
			const dsgIds = dsgRecords.map((r) => r.id);
			await dr.delete(deathsTable).where(inArray(deathsTable.dsgId, dsgIds));
			await dr.delete(injuredTable).where(inArray(injuredTable.dsgId, dsgIds));
			await dr.delete(missingTable).where(inArray(missingTable.dsgId, dsgIds));
			await dr
				.delete(affectedTable)
				.where(inArray(affectedTable.dsgId, dsgIds));
			await dr
				.delete(displacedTable)
				.where(inArray(displacedTable.dsgId, dsgIds));
		}

		await dr
			.delete(lossesTable)
			.where(inArray(lossesTable.recordId, recordIds));
		await dr
			.delete(damagesTable)
			.where(inArray(damagesTable.recordId, recordIds));
		await dr
			.delete(disruptionTable)
			.where(inArray(disruptionTable.recordId, recordIds));
		await dr
			.delete(humanCategoryPresenceTable)
			.where(inArray(humanCategoryPresenceTable.recordId, recordIds));
		await dr
			.delete(humanDsgTable)
			.where(inArray(humanDsgTable.recordId, recordIds));
	}

	await dr
		.delete(assetTable)
		.where(eq(assetTable.countryAccountsId, countryAccountId));
	await dr
		.delete(disasterRecordsTable)
		.where(eq(disasterRecordsTable.countryAccountsId, countryAccountId));

	const hazardousEvents = await dr
		.select({ id: hazardousEventTable.id })
		.from(hazardousEventTable)
		.where(eq(hazardousEventTable.countryAccountsId, countryAccountId));

	if (hazardousEvents.length > 0) {
		const hazardousEventIds = hazardousEvents.map((r) => r.id);
		await dr
			.delete(hazardousEventTable)
			.where(inArray(hazardousEventTable.id, hazardousEventIds));
		await dr
			.delete(eventTable)
			.where(inArray(eventTable.id, hazardousEventIds));
	}
}

export async function cleanupTestUser(ids: {
	userId: string;
	countryAccountId: string;
	countryId?: string;
}) {
	await cleanupTestDataByCountryAccount(ids.countryAccountId);
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
			.delete(countryAccountsTable)
			.where(eq(countryAccountsTable.id, ids.countryAccountId));
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
		getUserIdFromSession,
	} = await import("~/utils/session");

	const { requireUser, optionalUser } = await import("~/utils/auth");

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
	vi.mocked(getUserIdFromSession).mockResolvedValue(ids.userId);
	vi.mocked(requireUser).mockResolvedValue({
		user: { id: ids.userId, emailVerified: true, totpEnabled: false },
		sessionId: "test-session-id",
		session: { totpAuthed: true },
	} as any);
	vi.mocked(optionalUser).mockImplementation(async (args: any) => {
		if (args.userSession) {
			return args.userSession;
		}
		return {
			user: { id: ids.userId, emailVerified: true, totpEnabled: false },
			sessionId: "test-session-id",
			session: { totpAuthed: true },
		} as any;
	});
}

const createdOtherTenantCountryIds: string[] = [];
const createdOtherTenantCountryAccountIds: string[] = [];

export async function createOtherTenant() {
	const countryId = randomUUID();
	const id = randomUUID();
	await dr.insert(countriesTable).values({
		id: countryId,
		name: `Other Tenant Country ${countryId.slice(0, 8)}`,
	});
	await dr.insert(countryAccountsTable).values({
		id,
		shortDescription: "Other Tenant",
		countryId,
		status: 1,
		type: "Training",
	});
	createdOtherTenantCountryIds.push(countryId);
	createdOtherTenantCountryAccountIds.push(id);
	return id;
}

export async function cleanupOtherTenant() {
	for (const countryAccountId of createdOtherTenantCountryAccountIds) {
		await cleanupTestDataByCountryAccount(countryAccountId);
	}
	if (createdOtherTenantCountryAccountIds.length > 0) {
		await dr
			.delete(countryAccountsTable)
			.where(
				inArray(countryAccountsTable.id, createdOtherTenantCountryAccountIds),
			);
	}
	if (createdOtherTenantCountryIds.length > 0) {
		await dr
			.delete(countriesTable)
			.where(inArray(countriesTable.id, createdOtherTenantCountryIds));
	}
	createdOtherTenantCountryAccountIds.length = 0;
	createdOtherTenantCountryIds.length = 0;
}
