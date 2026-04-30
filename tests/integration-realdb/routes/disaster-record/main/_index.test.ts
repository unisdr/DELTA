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
import { createTestDisasterRecordWithEvent } from "./test-helpers";
import { loader as indexLoader } from "~/routes/$lang+/disaster-record+/_index";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-dr-index@");

setupSessionMocks();

async function callLoader(params: { page?: number; limit?: number } = {}) {
	const url = new URL(`${TEST_BASE_URL}/en/disaster-record`);
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
	let testData: Awaited<ReturnType<typeof createTestDisasterRecordWithEvent>>;

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		testData = await createTestDisasterRecordWithEvent(
			testIds.countryAccountId,
		);
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should return disaster records for tenant", async () => {
		const data = await callLoader();

		expect(data.data).toBeDefined();
		expect(data.data.items).toBeDefined();
		expect(Array.isArray(data.data.items)).toBe(true);
		expect(data.data.pagination).toBeDefined();
	});

	it("should include test disaster record in results", async () => {
		const data = await callLoader();

		const recordIds = data.data.items.map((item: any) => item.id);
		expect(recordIds).toContain(testData.disasterRecordId);
	});

	it("should return filters object", async () => {
		const data = await callLoader();

		expect(data.filters).toBeDefined();
		expect(data.filters.disasterEventName).toBeDefined();
		expect(data.filters.disasterRecordUUID).toBeDefined();
	});

	it("should return instance name", async () => {
		const data = await callLoader();

		expect(data.instanceName).toBeDefined();
	});

	it("should return sectors for filtering", async () => {
		const data = await callLoader();

		expect(data.sectors).toBeDefined();
		expect(Array.isArray(data.sectors)).toBe(true);
	});

	it("should filter by disaster event name", async () => {
		const url = new URL(`${TEST_BASE_URL}/en/disaster-record`);
		url.searchParams.set("disasterEventName", "Test Disaster Event");
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
		} as any);

		expect(data.filters.disasterEventName).toBe("Test Disaster Event");
	});

	it("should filter by disaster record UUID", async () => {
		const url = new URL(`${TEST_BASE_URL}/en/disaster-record`);
		url.searchParams.set(
			"disasterRecordUUID",
			testData.disasterRecordId.slice(0, 8),
		);
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
		} as any);

		const recordIds = data.data.items.map((item: any) => item.id);
		expect(recordIds).toContain(testData.disasterRecordId);
	});

	it("should filter by approval status for public users", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		const url = new URL(`${TEST_BASE_URL}/en/disaster-record`);
		const request = new Request(url.toString());
		const data = await indexLoader({
			request,
			params: { lang: "en" },
			context: {},
		} as any);

		expect(data.isPublic).toBe(true);
	});

	it("should return record with expected fields", async () => {
		const data = await callLoader();

		const record = data.data.items.find(
			(item: any) => item.id === testData.disasterRecordId,
		);
		expect(record).toBeDefined();
		expect(record!.id).toBe(testData.disasterRecordId);
		expect(record!.approvalStatus).toBeDefined();
		expect(record!.createdAt).toBeDefined();
	});

	it("should not return records from other tenants", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterRecordWithEvent(otherTenantId, {
			nameNational: "Other Tenant Event",
		});

		const data = await callLoader();

		const recordIds = data.data.items.map((item: any) => item.id);
		expect(recordIds).not.toContain(otherData.disasterRecordId);
		expect(recordIds).toContain(testData.disasterRecordId);

		await cleanupOtherTenant();
	});
});
