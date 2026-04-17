// Integration tests for human effects delete-all-data endpoint.
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
import { action as deleteAllAction } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/human-effects+/delete-all-data";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-delete-all@");

setupSessionMocks();

async function callAction(params: { disRecId: string }) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.disRecId}/human-effects/delete-all-data`;
	const request = new Request(url, {
		method: "POST",
	});
	return await deleteAllAction({
		request,
		params: { lang: "en", disRecId: params.disRecId },
		context: {},
	} as any);
}

describe("delete-all-data.ts action", () => {
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

	it("should delete all human effects data for a disaster record", async () => {
		const response = await callAction({
			disRecId: testDisasterIds.disasterRecordId,
		});
		const result = await response.json();

		expect(result.ok).toBe(true);
	});

	it("should return error for missing record id", async () => {
		await expect(
			callAction({
				disRecId: "",
			}),
		).rejects.toThrow("no record id");
	});

	it("should not delete data for different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherResult = await createTestHumanEffects(otherTenantId);

		const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${otherResult.disasterRecordId}/human-effects/delete-all-data`;
		const request = new Request(url, {
			method: "POST",
		});
		await expect(
			deleteAllAction({
				request,
				params: {
					lang: "en",
					disRecId: otherResult.disasterRecordId,
				},
				context: {},
			} as any),
		).rejects.toMatchObject({ status: 404 });

		await cleanupOtherTenant();
	});
});
