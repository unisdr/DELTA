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
import { loader as editLoader } from "~/routes/$lang+/disaster-record+/edit.$id";
import { randomUUID } from "crypto";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-dr-edit@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const url = new URL(`${TEST_BASE_URL}/en/disaster-record/edit/${params.id}`);
	const request = new Request(url.toString());
	return await editLoader({
		request,
		params: { lang: "en", id: params.id },
		context: {},
		userSession: {
			user: {
				id: testIds.userId,
				emailVerified: true,
				totpEnabled: false,
				firstName: "Test",
				lastName: "User",
			},
			sessionId: "test-session-id",
			session: { totpAuthed: true },
		},
	} as any);
}

describe("edit.$id.tsx loader", () => {
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

	it("should return new record form when id is 'new'", async () => {
		const data = await callLoader({ id: "new" });

		expect(data.item).toBeNull();
		expect(data.hip).toBeDefined();
		expect(data.treeData).toBeDefined();
	});

	it("should return existing disaster record", async () => {
		const data = await callLoader({ id: testData.disasterRecordId });

		expect(data.item).toBeDefined();
		expect(data.item!.id).toBe(testData.disasterRecordId);
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callLoader({ id: testData.disasterRecordId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 404 for non-existent record", async () => {
		await expect(callLoader({ id: randomUUID() })).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should return 404 for record from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterRecordWithEvent(otherTenantId);

		await expect(
			callLoader({ id: otherData.disasterRecordId }),
		).rejects.toMatchObject({ status: 404 });

		await cleanupOtherTenant();
	});

	it("should return hip data for hazard picker", async () => {
		const data = await callLoader({ id: testData.disasterRecordId });

		expect(data.hip).toBeDefined();
	});

	it("should return treeData for divisions", async () => {
		const data = await callLoader({ id: testData.disasterRecordId });

		expect(data.treeData).toBeDefined();
	});

	it("should return non-economic losses records", async () => {
		const data = await callLoader({ id: testData.disasterRecordId });

		expect(data.recordsNonecoLosses).toBeDefined();
		expect(Array.isArray(data.recordsNonecoLosses)).toBe(true);
	});

	it("should return sector records", async () => {
		const data = await callLoader({ id: testData.disasterRecordId });

		expect(data.recordsDisRecSectors).toBeDefined();
		expect(Array.isArray(data.recordsDisRecSectors)).toBe(true);
	});
});
