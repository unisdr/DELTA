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
} from "../../test-helpers";
import { createTestDisasterEventWithOptions } from "./test-helpers";
import { loader as indexLoader } from "~/routes/$lang+/disaster-event+/_index";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-de-index@");

setupSessionMocks();

async function callLoader(params: { page?: number; limit?: number } = {}) {
	const url = new URL(`${TEST_BASE_URL}/en/disaster-event`);
	if (params.page) {
		url.searchParams.set("page", params.page.toString());
	}
	if (params.limit) {
		url.searchParams.set("limit", params.limit.toString());
	}
	const request = new Request(url.toString());
	return await indexLoader({
		request,
		params: { lang: "en" },
		context: {},
	} as any);
}

describe("_index.tsx loader", () => {
	let testData: Awaited<ReturnType<typeof createTestDisasterEventWithOptions>>;

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		testData = await createTestDisasterEventWithOptions(
			testIds.countryAccountId,
		);
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should return disaster events for tenant", async () => {
		const data = await callLoader();

		expect(data.data).toBeDefined();
		expect(data.data.items).toBeDefined();
		expect(Array.isArray(data.data.items)).toBe(true);
		expect(data.data.pagination).toBeDefined();
	});

	it("should include test disaster event in results", async () => {
		const data = await callLoader();

		const eventIds = data.data.items.map((item: any) => item.id);
		expect(eventIds).toContain(testData.disasterEventId);
	});

	it("should return filters object", async () => {
		const data = await callLoader();

		expect(data.filters).toBeDefined();
		expect(data.filters.disasterEventName).toBeDefined();
		expect(data.filters.search).toBeDefined();
	});

	it("should return instance name", async () => {
		const data = await callLoader();

		expect(data.instanceName).toBeDefined();
	});

	it("should return isPublic flag", async () => {
		const data = await callLoader();

		expect(data.isPublic).toBeDefined();
	});

	it("should filter by disaster event name", async () => {
		const url = new URL(`${TEST_BASE_URL}/en/disaster-event`);
		url.searchParams.set("disasterEventName", "Test Disaster Event");
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
		} as any);

		expect(data.filters.disasterEventName).toBe("Test Disaster Event");
	});

	it("should filter by search term", async () => {
		const url = new URL(`${TEST_BASE_URL}/en/disaster-event`);
		url.searchParams.set("search", "Test");
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
		} as any);

		expect(data.filters.search).toBe("Test");
	});

	it("should filter by approval status for public users", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		const url = new URL(`${TEST_BASE_URL}/en/disaster-event`);
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
		} as any);

		expect(data.isPublic).toBe(true);
	});

	it("should return event with expected fields", async () => {
		const data = await callLoader();

		const event = data.data.items.find(
			(item: any) => item.id === testData.disasterEventId,
		);
		expect(event).toBeDefined();
		expect(event!.id).toBe(testData.disasterEventId);
		expect(event!.approvalStatus).toBeDefined();
		expect(event!.createdAt).toBeDefined();
	});

	it("should not return events from other tenants", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterEventWithOptions(otherTenantId, {
			nameNational: "Other Tenant Event",
		});

		const data = await callLoader();

		const eventIds = data.data.items.map((item: any) => item.id);
		expect(eventIds).not.toContain(otherData.disasterEventId);
		expect(eventIds).toContain(testData.disasterEventId);

		await cleanupOtherTenant();
	});

	it("should return common data", async () => {
		const data = await callLoader();

		expect(data.common).toBeDefined();
	});
});
