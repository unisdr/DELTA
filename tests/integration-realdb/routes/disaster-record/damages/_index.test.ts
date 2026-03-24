import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { createTestDamage, cleanupTestDamages } from "./test-helpers";
import { loader as indexLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/damages+/_index";

const AGRICULTURE_SECTOR_ID = "8cf24ec3-3567-4c40-a5fd-bff9e9a27d87";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-index@");

setupSessionMocks();

async function callLoader(inputParams: {
	disasterRecordId: string;
	sectorId: string;
}) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${inputParams.disasterRecordId}/damages?sectorId=${inputParams.sectorId}`;
	const request = new Request(url);
	return await indexLoader({
		request,
		params: { lang: "en", disRecId: inputParams.disasterRecordId },
		context: {},
	} as any);
}

describe("_index.tsx loader", () => {
	let testDisasterIds: {
		disasterRecordId: string;
		sectorId: string;
		assetId: string;
	};
	let testDamageIds: string[] = [];

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestDamage(testIds.countryAccountId);
		testDisasterIds = {
			disasterRecordId: result.disasterRecordId,
			sectorId: result.sectorId,
			assetId: result.assetId,
		};
		testDamageIds.push(result.damageId);
	});

	afterEach(async () => {
		await cleanupTestDamages();
		await cleanupTestUser(testIds);
		testDamageIds = [];
	});

	it("should return damages for disaster record and sector", async () => {
		const data = await callLoader({
			disasterRecordId: testDisasterIds.disasterRecordId,
			sectorId: testDisasterIds.sectorId,
		});

		const itemIds = data.data.items.map((item: any) => item.id);
		expect(itemIds).toContain(testDamageIds[0]);
	});

	it("should return pagination data", async () => {
		const data = await callLoader({
			disasterRecordId: testDisasterIds.disasterRecordId,
			sectorId: testDisasterIds.sectorId,
		});

		expect(data.data.pagination).toBeDefined();
		expect(data.data.pagination.totalItems).toBeGreaterThanOrEqual(1);
	});

	it("should return sectorFullPath", async () => {
		const data = await callLoader({
			disasterRecordId: testDisasterIds.disasterRecordId,
			sectorId: testDisasterIds.sectorId,
		});

		expect(data.sectorFullPath).toBe("Productive");
	});

	it("should return recordId and sectorId", async () => {
		const data = await callLoader({
			disasterRecordId: testDisasterIds.disasterRecordId,
			sectorId: testDisasterIds.sectorId,
		});

		expect(data.recordId).toBe(testDisasterIds.disasterRecordId);
		expect(data.sectorId).toBe(testDisasterIds.sectorId);
	});

	it("should return asset and sector names for damages", async () => {
		const data = await callLoader({
			disasterRecordId: testDisasterIds.disasterRecordId,
			sectorId: testDisasterIds.sectorId,
		});

		const item = data.data.items.find(
			(item: any) => item.id === testDamageIds[0],
		);
		expect(item).toBeDefined();
		expect(item!.asset).toBeDefined();
		expect(item!.asset.name).toBeDefined();
		expect(item!.sector).toBeDefined();
		expect(item!.sector.name).toBeDefined();
	});

	it("should throw 404 when sectorId is not provided", async () => {
		await expect(
			callLoader({
				disasterRecordId: testDisasterIds.disasterRecordId,
				sectorId: "",
			}),
		).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should return sectorFullPath for nested sector (Agriculture > Productive)", async () => {
		const result = await createTestDamage(testIds.countryAccountId, {
			sectorId: AGRICULTURE_SECTOR_ID,
		});
		testDamageIds.push(result.damageId);

		const data = await callLoader({
			disasterRecordId: result.disasterRecordId,
			sectorId: AGRICULTURE_SECTOR_ID,
		});

		expect(data.sectorFullPath).toBe("Agriculture > Productive");
	});
});
