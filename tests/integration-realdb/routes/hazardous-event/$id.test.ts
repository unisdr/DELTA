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
import { loader as viewLoader } from "~/routes/$lang+/hazardous-event+/$id";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-view@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const url = new URL(`${TEST_BASE_URL}/en/hazardous-event/${params.id}`);
	const request = new Request(url.toString());
	return await viewLoader({
		request,
		params: { lang: "en", id: params.id },
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

describe("$id.tsx loader", () => {
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

	it("should return hazardous event by id", async () => {
		const data = await callLoader({ id: testData.hazardousEventId });

		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(testData.hazardousEventId);
	});

	it("should return 400 when id is missing", async () => {
		await expect(callLoader({ id: "" })).rejects.toMatchObject({ status: 400 });
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callLoader({ id: testData.hazardousEventId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 401 for hazardous event from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestHazardousEventWithOptions(otherTenantId);

		await expect(
			callLoader({ id: otherData.hazardousEventId }),
		).rejects.toMatchObject({ status: 401 });

		await cleanupOtherTenant();
	});

	it("should return event with hip info", async () => {
		const data = await callLoader({ id: testData.hazardousEventId });

		expect(data.item.hipHazardId).toBeDefined();
		expect(data.item.hipClusterId).toBeDefined();
		expect(data.item.hipTypeId).toBeDefined();
	});
});
