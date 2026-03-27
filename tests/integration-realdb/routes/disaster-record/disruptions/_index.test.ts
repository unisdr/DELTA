import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { createTestDisruption } from "./test-helpers";
import { loader as indexLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/disruptions+/_index";

const AGRICULTURE_SECTOR_ID = "8cf24ec3-3567-4c40-a5fd-bff9e9a27d87";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-disruptions-index@");

setupSessionMocks();

async function callLoader(inputParams: {
	disasterRecordId: string;
	sectorId: string;
}) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${inputParams.disasterRecordId}/disruptions?sectorId=${inputParams.sectorId}`;
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
	};
	let testDisruptionId: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestDisruption(testIds.countryAccountId);
		testDisasterIds = {
			disasterRecordId: result.disasterRecordId,
			sectorId: result.sectorId,
		};
		testDisruptionId = result.disruptionId;
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should return disruptions for disaster record and sector", async () => {
		const data = await callLoader({
			disasterRecordId: testDisasterIds.disasterRecordId,
			sectorId: testDisasterIds.sectorId,
		});

		const itemIds = data.data.items.map((item: any) => item.id);
		expect(itemIds).toContain(testDisruptionId);
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

	it("should return sector name for disruptions", async () => {
		const data = await callLoader({
			disasterRecordId: testDisasterIds.disasterRecordId,
			sectorId: testDisasterIds.sectorId,
		});

		const item = data.data.items.find(
			(item: any) => item.id === testDisruptionId,
		);
		expect(item).toBeDefined();
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
		const result = await createTestDisruption(testIds.countryAccountId, {
			sectorId: AGRICULTURE_SECTOR_ID,
		});

		const data = await callLoader({
			disasterRecordId: result.disasterRecordId,
			sectorId: AGRICULTURE_SECTOR_ID,
		});

		expect(data.sectorFullPath).toBe("Agriculture > Productive");
	});
});
