// Integration tests for human effects clear endpoint.
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
import { action as clearAction } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/human-effects+/clear";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-clear@");

setupSessionMocks();

async function callAction(params: { disRecId: string; table: string }) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.disRecId}/human-effects/clear?table=${params.table}`;
	const request = new Request(url, {
		method: "POST",
	});
	return await clearAction({
		request,
		params: { lang: "en", disRecId: params.disRecId },
		context: {},
	} as any);
}

describe("clear.ts action", () => {
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

	it("should clear data for Deaths table", async () => {
		const response = await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			table: "Deaths",
		});
		const result = await response.json();

		expect(result.ok).toBe(true);
	});

	it("should return error for invalid table", async () => {
		const response = await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			table: "InvalidTable",
		});
		const result = await response.json();

		expect(result.ok).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("should return error for missing record id", async () => {
		await expect(
			callAction({
				disRecId: "",
				table: "Deaths",
			}),
		).rejects.toThrow("no record id");
	});

	it("should not clear data for different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherResult = await createTestHumanEffects(otherTenantId);

		const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${otherResult.disasterRecordId}/human-effects/clear?table=Deaths`;
		const request = new Request(url, {
			method: "POST",
		});
		await expect(
			clearAction({
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
