// Integration tests for human effects main page.
// See _docs/human-direct-effects.md for overview.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
	createOtherTenant,
	cleanupOtherTenant,
} from "../../../test-helpers";
import { createTestHumanEffects } from "./test-helpers";
import { loader as indexLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/human-effects+/_index";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-index@");

setupSessionMocks();

async function callLoader(params: { disRecId: string; tbl?: string }) {
	const url = new URL(
		`${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.disRecId}/human-effects`,
	);
	if (params.tbl) {
		url.searchParams.set("tbl", params.tbl);
	}
	const request = new Request(url.toString());
	return await indexLoader({
		request,
		params: { lang: "en", disRecId: params.disRecId },
		context: {},
	} as any);
}

describe("_index.tsx loader", () => {
	let testDisasterIds: {
		disasterRecordId: string;
		dsgId: string;
		deathsId: string;
		categoryPresenceId: string;
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestHumanEffects(testIds.countryAccountId);
		testDisasterIds = {
			disasterRecordId: result.disasterRecordId,
			dsgId: result.dsgId,
			deathsId: result.deathsId,
			categoryPresenceId: result.categoryPresenceId,
		};
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should return data for existing disaster record", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
		});

		expect(data.recordId).toBe(testDisasterIds.disasterRecordId);
		expect(data.tblId).toBeDefined();
		expect(data.defs).toBeDefined();
		expect(Array.isArray(data.defs)).toBe(true);
	});

	it("should return data with specific table type", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
			tbl: "Deaths",
		});

		expect(data.tblId).toBe("Deaths");
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callLoader({ disRecId: testDisasterIds.disasterRecordId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 401 for disaster record from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherResult = await createTestHumanEffects(otherTenantId);

		await expect(
			callLoader({ disRecId: otherResult.disasterRecordId }),
		).rejects.toMatchObject({ status: 401 });

		await cleanupOtherTenant();
	});

	it("should return category presence data", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
		});

		expect(data.categoryPresence).toBeDefined();
	});

	it("should return total group flags", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
		});

		expect(data.totalGroupFlags).toBeDefined();
	});
});
