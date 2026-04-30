// Integration tests for deleteAllData error propagation (P0-7 fix).
// These tests run against PGlite via the global setup in vitest.config.ts.
// Seed inserts use testSchema table definitions (not production schema) so that
// column definitions match exactly what PGlite was initialised with.
import { describe, it, expect, vi, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { createTestBackendContext } from "~/backend.server/context";
import { ETError } from "~/frontend/editabletable/validate";
import { deleteAllData, clear } from "~/backend.server/handlers/human_effects";
// testSchema definitions match PGlite's actual columns (production schema may differ)
import { countriesTable } from "./testSchema/countriesTable";
import { countryAccounts as countryAccountsTable } from "./testSchema/countryAccounts";
import { eventTable } from "./testSchema/eventTable";
import { hazardousEventTable } from "./testSchema/hazardousEventTable";
import { disasterEventTable } from "./testSchema/disasterEventTable";
import { disasterRecordsTable } from "./testSchema/disasterRecordsTable";
import { humanCategoryPresenceTable } from "./testSchema/humanCategoryPresenceTable";
import { hipTypeTable } from "./testSchema/hipTypeTable";

// BackendContext reads globalThis.createTranslationGetter; set it up for tests.
// The same pattern is used in tests/integration-realdb/setup.ts.
// WHY: createTranslationGetter is normally initialised by init.server.tsx at runtime.
globalThis.createTranslationGetter = (_lang: string) => {
	return (params: { code: string }) => ({ msg: params.code });
};

// --- mock clearData so we can force an ETError without touching real DB rows ---
// vi.hoisted ensures mockClearData is available when the hoisted vi.mock factory runs.
const mockClearData = vi.hoisted(() => vi.fn());
vi.mock("~/backend.server/models/human_effects", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("~/backend.server/models/human_effects")
		>();
	return { ...actual, clearData: mockClearData };
});

// Stable IDs for seed data — reused across tests in the same run.
const COUNTRY_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const ACCOUNTS_ID = "aaaaaaaa-0000-0000-0000-000000000002";
const RECORD_ID = "aaaaaaaa-0000-0000-0000-000000000003";

/** Seed a minimal disaster record so the tenant check inside clearThrows passes. */
async function seedDisasterRecord() {
	await dr.transaction(async (tx) => {
		// hip_class row required by hazardous_event FK
		await tx
			.insert(hipTypeTable)
			.values({ id: "type1", name: { en: "Test Type" } })
			.onConflictDoNothing();

		await tx
			.insert(countriesTable)
			.values({ id: COUNTRY_ID, name: "DeleteAllDataTestCountry" })
			.onConflictDoNothing();
		await tx
			.insert(countryAccountsTable)
			.values({
				id: ACCOUNTS_ID,
				shortDescription: "DAD",
				countryId: COUNTRY_ID,
			})
			.onConflictDoNothing();

		const [ev] = await tx
			.insert(eventTable)
			.values({})
			.returning({ id: eventTable.id });
		await tx.insert(hazardousEventTable).values({
			id: ev.id,
			countryAccountsId: ACCOUNTS_ID,
			hipTypeId: "type1",
		} as typeof hazardousEventTable.$inferInsert);

		const [dev] = await tx
			.insert(eventTable)
			.values({})
			.returning({ id: eventTable.id });
		await tx.insert(disasterEventTable).values({
			id: dev.id,
			hazardousEventId: ev.id,
			countryAccountsId: ACCOUNTS_ID,
		} as typeof disasterEventTable.$inferInsert);

		await tx
			.insert(disasterRecordsTable)
			.values({
				id: RECORD_ID,
				disasterEventId: dev.id,
				countryAccountsId: ACCOUNTS_ID,
			} as typeof disasterRecordsTable.$inferInsert)
			.onConflictDoNothing();
	});
}

describe("deleteAllData — error propagation (P0-7)", () => {
	afterEach(() => {
		mockClearData.mockReset();
	});

	// Task 1.1
	// WHY this is a red test: with the current code, clear() catches the ETError and
	// returns Response.json({ ok: false }) with status 200. deleteAllData checks
	// r.ok (always true for status 200) and continues silently.
	// After the fix, clearThrows() throws the ETError and deleteAllData propagates it.
	it("throws when clearData returns an ETError instead of swallowing it", async () => {
		await seedDisasterRecord();
		mockClearData.mockResolvedValue({
			ok: false,
			error: new ETError("test_code", "Simulated clearData failure"),
		});

		const ctx = createTestBackendContext();
		await expect(deleteAllData(ctx, RECORD_ID, ACCOUNTS_ID)).rejects.toThrow();
	});

	// Task 1.2
	// WHY this is a red test: with current code, deleteAllData doesn't throw on ETError,
	// so it reaches categoryPresenceDeleteAll and deletes the presence row.
	// After the fix, deleteAllData throws on the first table failure and never reaches
	// categoryPresenceDeleteAll, leaving the presence row intact.
	it("does not call categoryPresenceDeleteAll when a table clear fails", async () => {
		await seedDisasterRecord();
		// Insert a category-presence marker tied to the test record.
		// After the fix: deleteAllData throws before reaching categoryPresenceDeleteAll,
		// so the marker is NOT deleted.
		// With current code: deleteAllData silently continues and DOES call
		// categoryPresenceDeleteAll, which deletes the marker.
		const markerRowId = crypto.randomUUID();
		await dr.insert(humanCategoryPresenceTable).values({
			id: markerRowId,
			recordId: RECORD_ID,
		} as typeof humanCategoryPresenceTable.$inferInsert);

		mockClearData.mockResolvedValue({
			ok: false,
			error: new ETError("test_code", "Simulated clearData failure"),
		});

		const ctx = createTestBackendContext();
		await expect(deleteAllData(ctx, RECORD_ID, ACCOUNTS_ID)).rejects.toThrow();

		// Marker must still exist — categoryPresenceDeleteAll was never called.
		const rows = await dr
			.select({ id: humanCategoryPresenceTable.id })
			.from(humanCategoryPresenceTable)
			.where(eq(humanCategoryPresenceTable.id, markerRowId));
		expect(rows).toHaveLength(1);
	});

	// Task 1.3
	// This is a regression guard: clear() must continue returning a Response object
	// (not throw) when given an invalid table name, even after the refactor.
	it("clear() returns a Response for an unrecognised table name (contract preserved)", async () => {
		const result = await clear("not-a-valid-table", RECORD_ID, ACCOUNTS_ID);
		expect(result).toBeInstanceOf(Response);
		const body = await result.json();
		expect(body.ok).toBe(false);
	});
});
