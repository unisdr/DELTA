import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "crypto";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { createTestLosses, cleanupTestLosses } from "./test-helpers";
import {
	loader as editLoader,
	action as editAction,
} from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/losses+/edit.$id";

let testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-losses-edit@");

setupSessionMocks();

async function callLoader(params: {
	recordId: string;
	sectorId: string;
	id: string;
}) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.recordId}/losses/edit/${params.id}?sectorId=${params.sectorId}`;
	const request = new Request(url);
	return await editLoader({
		request,
		params: { lang: "en", disRecId: params.recordId, id: params.id },
		context: {},
	} as any);
}

async function callAction(params: {
	recordId: string;
	id: string;
	formData: Record<string, string>;
}) {
	const form = new URLSearchParams({
		...params.formData,
		_action: params.id === "new" ? "create" : "update",
	});
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.recordId}/losses/edit/${params.id}`;
	const request = new Request(url, {
		method: "POST",
		body: form,
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});
	return await editAction({
		request,
		params: { lang: "en", disRecId: params.recordId, id: params.id },
		context: {},
	} as any);
}

describe("edit.$id.tsx", () => {
	describe("edit.$id.tsx loader", () => {
		let testDisasterIds: {
			disasterRecordId: string;
			sectorId: string;
		};
		let testLossesIds: string[] = [];

		beforeEach(async () => {
			vi.clearAllMocks();
			await mockSessionValues(testIds);
			await createTestUser(testIds);

			const result = await createTestLosses(testIds.countryAccountId);
			testDisasterIds = {
				disasterRecordId: result.disasterRecordId,
				sectorId: result.sectorId,
			};
			testLossesIds.push(result.lossesId);
		});

		afterEach(async () => {
			await cleanupTestLosses();
			await cleanupTestUser(testIds);
			testLossesIds = [];
		});

		it("should return losses data for existing losses record", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testLossesIds[0],
			});

			expect(data.item).toBeDefined();
			expect(data.item!.id).toBe(testLossesIds[0]);
		});

		it("should return null item for new losses record", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: "new",
			});

			expect(data.item).toBeNull();
		});

		it("should return fieldDef", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testLossesIds[0],
			});

			expect(data.fieldDef).toBeDefined();
			expect(Array.isArray(data.fieldDef)).toBe(true);
		});

		it("should return recordId and sectorId", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testLossesIds[0],
			});

			expect(data.recordId).toBe(testDisasterIds.disasterRecordId);
			expect(data.sectorId).toBe(testDisasterIds.sectorId);
		});

		it("should return divisionGeoJSON", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testLossesIds[0],
			});

			expect(data.divisionGeoJSON).toBeDefined();
			expect(Array.isArray(data.divisionGeoJSON)).toBe(true);
		});

		it("should return ctryIso3", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testLossesIds[0],
			});

			expect(data.ctryIso3).toBeDefined();
			expect(typeof data.ctryIso3).toBe("string");
		});

		it("should return 404 for non-existent losses record", async () => {
			await expect(
				callLoader({
					recordId: testDisasterIds.disasterRecordId,
					sectorId: testDisasterIds.sectorId,
					id: randomUUID(),
				}),
			).rejects.toMatchObject({ status: 404 });
		});

		it("should return 404 when sectorId is invalid (not a UUID)", async () => {
			await expect(
				callLoader({
					recordId: testDisasterIds.disasterRecordId,
					sectorId: "invalid-sector-id",
					id: "new",
				}),
			).rejects.toMatchObject({ status: 404 });
		});

		it("should return 404 when sectorId is valid UUID but does not exist", async () => {
			await expect(
				callLoader({
					recordId: testDisasterIds.disasterRecordId,
					sectorId: randomUUID(),
					id: "new",
				}),
			).rejects.toMatchObject({ status: 404 });
		});
	});

	describe("edit.$id.tsx action", () => {
		let testDisasterIds: {
			disasterRecordId: string;
			sectorId: string;
		};
		let testLossesIds: string[] = [];

		beforeEach(async () => {
			vi.clearAllMocks();
			await mockSessionValues(testIds);
			await createTestUser(testIds);

			const result = await createTestLosses(testIds.countryAccountId);
			testDisasterIds = {
				disasterRecordId: result.disasterRecordId,
				sectorId: result.sectorId,
			};
			testLossesIds.push(result.lossesId);
		});

		afterEach(async () => {
			await cleanupTestLosses();
			await cleanupTestUser(testIds);
			testLossesIds = [];
		});

		it("should create new losses record", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				sectorIsAgriculture: "false",
			};

			const response = await callAction({
				recordId: testDisasterIds.disasterRecordId,
				id: "new",
				formData,
			});

			expect(response).toBeInstanceOf(Response);
			expect((response as Response).status).toBe(302);
			const location = (response as Response).headers.get("Location");
			expect(location).toContain("/disaster-record/edit-sub/");
			expect(location).toContain("/losses/");
		});

		it("should update existing losses record", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				sectorIsAgriculture: "false",
			};

			const response = await callAction({
				recordId: testDisasterIds.disasterRecordId,
				id: testLossesIds[0],
				formData,
			});

			expect(response).toBeInstanceOf(Response);
			expect((response as Response).status).toBe(302);
			const location = (response as Response).headers.get("Location");
			expect(location).toContain("/disaster-record/edit-sub/");
			expect(location).toContain("/losses/");
		});

		it("should return 404 for non-existent losses record on update", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				sectorIsAgriculture: "false",
			};

			await expect(
				callAction({
					recordId: testDisasterIds.disasterRecordId,
					id: randomUUID(),
					formData,
				}),
			).rejects.toMatchObject({ status: 404 });
		});
	});
});
