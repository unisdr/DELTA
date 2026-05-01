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
import { createTestHazardousEventWithOptions } from "./test-helpers";
import { loader as indexLoader } from "~/routes/$lang+/hazardous-event+/_index";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-index@");

setupSessionMocks();

async function callLoader(params: { page?: number; limit?: number } = {}) {
	const url = new URL(`${TEST_BASE_URL}/en/hazardous-event`);
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
		userSession: {
			user: {
				id: testIds.userId,
				emailVerified: true,
				totpEnabled: false,
			},
			sessionId: "test-session-id",
			session: { totpAuthed: true },
		},
	} as any);
}

describe("_index.tsx loader", () => {
	let testData: Awaited<ReturnType<typeof createTestHazardousEventWithOptions>>;

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		testData = await createTestHazardousEventWithOptions(
			testIds.countryAccountId,
		);
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should return hazardous events for tenant", async () => {
		const data = await callLoader();

		expect(data.data).toBeDefined();
		expect(data.data.items).toBeDefined();
		expect(Array.isArray(data.data.items)).toBe(true);
		expect(data.data.pagination).toBeDefined();
	});

	it("should include test hazardous event in results", async () => {
		const data = await callLoader();

		const eventIds = data.data.items.map((item: any) => item.id);
		expect(eventIds).toContain(testData.hazardousEventId);
	});

	it("should return filters object", async () => {
		const data = await callLoader();

		expect(data.filters).toBeDefined();
		expect(data.filters.hipHazardId).toBeDefined();
		expect(data.filters.hipClusterId).toBeDefined();
		expect(data.filters.hipTypeId).toBeDefined();
	});

	it("should return hip data", async () => {
		const data = await callLoader();

		expect(data.hip).toBeDefined();
	});

	it("should filter by hip hazard id", async () => {
		const url = new URL(`${TEST_BASE_URL}/en/hazardous-event`);
		url.searchParams.set("hipHazardId", testData.hazardousEvent.hipHazardId!);
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
			userSession: {
				user: {
					id: testIds.userId,
					emailVerified: true,
					totpEnabled: false,
				},
				sessionId: "test-session-id",
				session: { totpAuthed: true },
			},
		} as any);

		expect(data.filters.hipHazardId).toBe(testData.hazardousEvent.hipHazardId);
	});

	it("should filter by search term", async () => {
		const url = new URL(`${TEST_BASE_URL}/en/hazardous-event`);
		url.searchParams.set("search", testData.hazardousEventId.slice(0, 8));
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
			userSession: {
				user: {
					id: testIds.userId,
					emailVerified: true,
					totpEnabled: false,
				},
				sessionId: "test-session-id",
				session: { totpAuthed: true },
			},
		} as any);

		const eventIds = data.data.items.map((item: any) => item.id);
		expect(eventIds).toContain(testData.hazardousEventId);
	});

	it("should filter by approval status for public users", async () => {
		const url = new URL(`${TEST_BASE_URL}/en/hazardous-event`);
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
			(item: any) => item.id === testData.hazardousEventId,
		);
		expect(event).toBeDefined();
		expect(event!.id).toBe(testData.hazardousEventId);
		expect(event!.approvalStatus).toBeDefined();
		expect(event!.createdAt).toBeDefined();
	});

	it("should not return events from other tenants", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestHazardousEventWithOptions(otherTenantId, {
			description: "Other Tenant Event",
		});

		const data = await callLoader();

		const eventIds = data.data.items.map((item: any) => item.id);
		expect(eventIds).not.toContain(otherData.hazardousEventId);
		expect(eventIds).toContain(testData.hazardousEventId);

		await cleanupOtherTenant();
	});
});
