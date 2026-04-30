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
import { randomUUID } from "crypto";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { loader as editLoader } from "~/routes/$lang+/disaster-event+/edit.$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-de-edit@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const url = new URL(`${TEST_BASE_URL}/en/disaster-event/edit/${params.id}`);
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

	it("should return new record form when id is 'new'", async () => {
		const data = await callLoader({ id: "new" });

		expect(data.item).toBeNull();
		expect(data.hip).toBeDefined();
		expect(data.treeData).toBeDefined();
	});

	it("should return existing disaster event", async () => {
		const data = await callLoader({ id: testData.disasterEventId });

		expect(data.item).toBeDefined();
		expect(data.item!.id).toBe(testData.disasterEventId);
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callLoader({ id: testData.disasterEventId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should throw error for non-existent event", async () => {
		await expect(callLoader({ id: randomUUID() })).rejects.toThrow();
	});

	it("should return 401 for event from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterEventWithOptions(otherTenantId);

		await expect(
			callLoader({ id: otherData.disasterEventId }),
		).rejects.toMatchObject({ status: 401 });

		await cleanupOtherTenant();
	});

	it("should return hip data for hazard picker", async () => {
		const data = await callLoader({ id: testData.disasterEventId });

		expect(data.hip).toBeDefined();
	});

	it("should return treeData for divisions", async () => {
		const data = await callLoader({ id: testData.disasterEventId });

		expect(data.treeData).toBeDefined();
	});

	it("should return ctryIso3", async () => {
		const data = await callLoader({ id: testData.disasterEventId });

		expect(data.ctryIso3).toBeDefined();
	});

	it("should return user data", async () => {
		const data = await callLoader({ id: testData.disasterEventId });

		expect(data.user).toBeDefined();
	});
});
