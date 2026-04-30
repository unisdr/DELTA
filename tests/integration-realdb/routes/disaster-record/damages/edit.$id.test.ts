import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "crypto";
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
import { createTestDamage } from "./test-helpers";
import {
	loader as editLoader,
	action as editAction,
} from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/damages+/edit.$id";

let testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-edit@");

setupSessionMocks();

async function callLoader(params: {
	recordId: string;
	sectorId: string;
	id: string;
}) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.recordId}/damages/edit/${params.id}?sectorId=${params.sectorId}`;
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
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.recordId}/damages/edit/${params.id}`;
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
			assetId: string;
		};
		let testDamageId: string;

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
			testDamageId = result.damageId;
		});

		afterEach(async () => {
			await cleanupTestUser(testIds);
		});

		it("should return damage data for existing damage", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDamageId,
			});

			expect(data.item).toBeDefined();
			expect(data.item!.id).toBe(testDamageId);
		});

		it("should return null item for new damage", async () => {
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
				id: testDamageId,
			});

			expect(data.fieldDef).toBeDefined();
			expect(Array.isArray(data.fieldDef)).toBe(true);
		});

		it("should return assets for sector", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDamageId,
			});

			expect(data.assets).toBeDefined();
			expect(Array.isArray(data.assets)).toBe(true);
		});

		it("should return recordId and sectorId", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDamageId,
			});

			expect(data.recordId).toBe(testDisasterIds.disasterRecordId);
			expect(data.sectorId).toBe(testDisasterIds.sectorId);
		});

		it("should return currencies", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDamageId,
			});

			expect(data.currencies).toBeDefined();
			expect(Array.isArray(data.currencies)).toBe(true);
		});

		it("should return divisionGeoJSON", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDamageId,
			});

			expect(data.divisionGeoJSON).toBeDefined();
			expect(Array.isArray(data.divisionGeoJSON)).toBe(true);
		});

		it("should return ctryIso3", async () => {
			const data = await callLoader({
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				id: testDamageId,
			});

			expect(data.ctryIso3).toBeDefined();
			expect(typeof data.ctryIso3).toBe("string");
		});

		it("should return 404 for non-existent damage", async () => {
			await expect(
				callLoader({
					recordId: testDisasterIds.disasterRecordId,
					sectorId: testDisasterIds.sectorId,
					id: randomUUID(),
				}),
			).rejects.toMatchObject({ status: 404 });
		});

		it("should throw 404 when sectorId is invalid", async () => {
			const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${testDisasterIds.disasterRecordId}/damages/edit/new?sectorId=xxx`;
			const request = new Request(url);
			try {
				await editLoader({
					request,
					params: {
						lang: "en",
						disRecId: testDisasterIds.disasterRecordId,
						id: "new",
					},
					context: {},
				} as any);
				throw new Error("Expected loader to throw");
			} catch (error: any) {
				expect(error.status).toBe(404);
			}
		});

		it("should throw 404 when sectorId is valid UUID but does not exist", async () => {
			const fakeSectorId = randomUUID();
			const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${testDisasterIds.disasterRecordId}/damages/edit/new?sectorId=${fakeSectorId}`;
			const request = new Request(url);
			try {
				await editLoader({
					request,
					params: {
						lang: "en",
						disRecId: testDisasterIds.disasterRecordId,
						id: "new",
					},
					context: {},
				} as any);
				throw new Error("Expected loader to throw");
			} catch (error: any) {
				expect(error.status).toBe(404);
			}
		});

		it("should throw 404 for damage from different tenant", async () => {
			const otherTenantId = await createOtherTenant();
			const otherResult = await createTestDamage(otherTenantId);

			await expect(
				callLoader({
					recordId: otherResult.disasterRecordId,
					sectorId: otherResult.sectorId,
					id: otherResult.damageId,
				}),
			).rejects.toMatchObject({ status: 404 });

			await cleanupOtherTenant();
		});
	});

	describe("edit.$id.tsx action", () => {
		let testDisasterIds: {
			disasterRecordId: string;
			sectorId: string;
			assetId: string;
		};
		let testDamageId: string;

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
			testDamageId = result.damageId;
		});

		afterEach(async () => {
			await cleanupTestUser(testIds);
		});

		it("should create new damage", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				assetId: testDisasterIds.assetId,
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
			expect(location).toContain("/damages/");
		});

		it("should update existing damage", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				assetId: testDisasterIds.assetId,
			};

			const response = await callAction({
				recordId: testDisasterIds.disasterRecordId,
				id: testDamageId,
				formData,
			});

			expect(response).toBeInstanceOf(Response);
			expect((response as Response).status).toBe(302);
			const location = (response as Response).headers.get("Location");
			expect(location).toContain("/disaster-record/edit-sub/");
			expect(location).toContain("/damages/");
		});

		it("should return 404 for non-existent damage on update", async () => {
			const formData = {
				recordId: testDisasterIds.disasterRecordId,
				sectorId: testDisasterIds.sectorId,
				assetId: testDisasterIds.assetId,
			};

			await expect(
				callAction({
					recordId: testDisasterIds.disasterRecordId,
					id: randomUUID(),
					formData,
				}),
			).rejects.toMatchObject({ status: 404 });
		});

		it("should return 404 for update for damage from different tenant", async () => {
			const otherTenantId = await createOtherTenant();
			const otherResult = await createTestDamage(otherTenantId);

			const formData = {
				recordId: otherResult.disasterRecordId,
				sectorId: otherResult.sectorId,
				assetId: otherResult.assetId,
			};

			const response = callAction({
				recordId: otherResult.disasterRecordId,
				id: otherResult.damageId,
				formData,
			});

			await expect(response).rejects.toMatchObject({ status: 404 });

			await cleanupOtherTenant();
		});
	});
});
