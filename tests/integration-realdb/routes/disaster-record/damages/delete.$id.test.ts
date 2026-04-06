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
import { action as deleteAction } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/damages+/delete.$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-delete@");

setupSessionMocks();

describe("delete.$id.tsx action", () => {
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

	async function callAction(params: { id: string }) {
		const form = new URLSearchParams({ _action: "delete" });
		const request = new Request(
			`${TEST_BASE_URL}/en/disaster-record/edit-sub/${testDisasterIds.disasterRecordId}/damages/delete/${params.id}`,
			{
				method: "POST",
				body: form,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);
		return await deleteAction({
			request,
			params: {
				lang: "en",
				disRecId: testDisasterIds.disasterRecordId,
				...params,
			},
			context: {},
		} as any);
	}

	it("should return 404 for non-existent damage", async () => {
		await expect(callAction({ id: randomUUID() })).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should return 404 for delete for damage from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherResult = await createTestDamage(otherTenantId);

		const form = new URLSearchParams({ _action: "delete" });
		const request = new Request(
			`${TEST_BASE_URL}/en/disaster-record/edit-sub/${otherResult.disasterRecordId}/damages/delete/${otherResult.damageId}`,
			{
				method: "POST",
				body: form,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);
		const response = await deleteAction({
			request,
			params: {
				lang: "en",
				disRecId: otherResult.disasterRecordId,
				id: otherResult.damageId,
			},
			context: {},
		} as any);

		expect(response).toHaveProperty("error");

		await cleanupOtherTenant();
	});

	it("should delete damage", async () => {
		const response = await callAction({ id: testDamageId });

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(302);
		const location = (response as Response).headers.get("Location");
		expect(location).toContain("/disaster-record/edit-sub/");
		expect(location).toContain("sectorId=");
	});
});
