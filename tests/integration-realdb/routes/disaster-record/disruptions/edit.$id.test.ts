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
import { createTestDisruption } from "./test-helpers";
import {
	loader as editLoader,
	action as editAction,
} from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/disruptions+/edit.$id";

let testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-disruptions-edit@");

setupSessionMocks();

async function callLoader(params: {
	recordId: string;
	sectorId: string;
	id: string;
}) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.recordId}/disruptions/edit/${params.id}?sectorId=${params.sectorId}`;
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
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.recordId}/disruptions/edit/${params.id}`;
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

		it("should return disruption data for existing disruption record", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDisruptionId,
			});

			expect(data.item).toBeDefined();
			expect(data.item!.id).toBe(testDisruptionId);
		});

		it("should return null item for new disruption record", async () => {
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
				id: testDisruptionId,
			});

			expect(data.fieldDef).toBeDefined();
			expect(Array.isArray(data.fieldDef)).toBe(true);
		});

		it("should return recordId and sectorId", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDisruptionId,
			});

			expect(data.recordId).toBe(testDisasterIds.disasterRecordId);
			expect(data.sectorId).toBe(testDisasterIds.sectorId);
		});

		it("should return divisionGeoJSON", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDisruptionId,
			});

			expect(data.divisionGeoJSON).toBeDefined();
			expect(Array.isArray(data.divisionGeoJSON)).toBe(true);
		});

		it("should return ctryIso3", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDisruptionId,
			});

			expect(data.ctryIso3).toBeDefined();
			expect(typeof data.ctryIso3).toBe("string");
		});

		it("should return 404 for non-existent disruption record", async () => {
			await expect(
				callLoader({
					recordId: testDisasterIds.disasterRecordId,
					sectorId: testDisasterIds.sectorId,
					id: randomUUID(),
				}),
			).rejects.toMatchObject({ status: 404 });
		});
	});

	describe("edit.$id.tsx action", () => {
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

		it("should create new disruption record", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
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
			expect(location).toContain("/disruptions/");
		});

		it("should update existing disruption record", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
			};

			const response = await callAction({
				recordId: testDisasterIds.disasterRecordId,
				id: testDisruptionId,
				formData,
			});

			expect(response).toBeInstanceOf(Response);
			expect((response as Response).status).toBe(302);
			const location = (response as Response).headers.get("Location");
			expect(location).toContain("/disaster-record/edit-sub/");
			expect(location).toContain("/disruptions/");
		});

		it("should return 404 for non-existent disruption record on update", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
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
