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
import { createTestLosses } from "./test-helpers";
import { action as deleteAction } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/losses+/delete.$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-losses-delete@");

setupSessionMocks();

describe("delete.$id.tsx action", () => {
	let testDisasterIds: {
		disasterRecordId: string;
		sectorId: string;
	};
	let testLossesId: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestLosses(testIds.countryAccountId);
		testDisasterIds = {
			disasterRecordId: result.disasterRecordId,
			sectorId: result.sectorId,
		};
		testLossesId = result.lossesId;
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	async function callAction(params: { id: string }) {
		const form = new URLSearchParams({ _action: "delete" });
		const request = new Request(
			`${TEST_BASE_URL}/en/disaster-record/edit-sub/${testDisasterIds.disasterRecordId}/losses/delete/${params.id}`,
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

	it("should return 404 for non-existent losses record", async () => {
		await expect(callAction({ id: randomUUID() })).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should return 404 for delete for losses from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherResult = await createTestLosses(otherTenantId);

		const form = new URLSearchParams({ _action: "delete" });
		const request = new Request(
			`${TEST_BASE_URL}/en/disaster-record/edit-sub/${otherResult.disasterRecordId}/losses/delete/${otherResult.lossesId}`,
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
				id: otherResult.lossesId,
			},
			context: {},
		} as any);

		expect(response).toHaveProperty("error");

		await cleanupOtherTenant();
	});

	it("should delete losses record", async () => {
		const response = await callAction({ id: testLossesId });

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(302);
		const location = (response as Response).headers.get("Location");
		expect(location).toContain("/disaster-record/edit-sub/");
		expect(location).toContain("sectorId=");
	});
});
