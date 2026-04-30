// Integration tests for human effects load endpoint.
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
import { loader as loadLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/human-effects+/load";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-load@");

setupSessionMocks();

async function callLoader(params: { disRecId: string; tbl?: string }) {
	const url = new URL(
		`${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.disRecId}/human-effects/load`,
	);
	if (params.tbl) {
		url.searchParams.set("tbl", params.tbl);
	}
	const request = new Request(url.toString());
	return await loadLoader({
		request,
		params: { lang: "en", disRecId: params.disRecId },
		context: {},
	} as any);
}

describe("load.ts loader", () => {
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
		const response = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
		});
		const data = await response.json();

		expect(data.recordId).toBe(testDisasterIds.disasterRecordId);
		expect(data.tblId).toBeDefined();
		expect(data.defs).toBeDefined();
		expect(Array.isArray(data.defs)).toBe(true);
	});

	it("should return data with specific table type", async () => {
		const response = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
			tbl: "Deaths",
		});
		const data = await response.json();

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

	it("should return data for disaster record from different tenant (no tenant check in load)", async () => {
		const otherTenantId = await createOtherTenant();
		const otherResult = await createTestHumanEffects(otherTenantId);

		const response = await callLoader({
			disRecId: otherResult.disasterRecordId,
		});
		const data = await response.json();

		expect(data.recordId).toBe(otherResult.disasterRecordId);

		await cleanupOtherTenant();
	});

	it("should return ids and data arrays", async () => {
		const response = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
		});
		const data = await response.json();

		expect(data.ids).toBeDefined();
		expect(Array.isArray(data.ids)).toBe(true);
		expect(data.data).toBeDefined();
		expect(Array.isArray(data.data)).toBe(true);
	});

	it("should return category presence", async () => {
		const response = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
		});
		const data = await response.json();

		expect(data.categoryPresence).toBeDefined();
	});

	it("should return total group flags", async () => {
		const response = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
		});
		const data = await response.json();

		expect(data.totalGroupFlags).toBeDefined();
	});
});
