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
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { loader as viewLoader } from "~/routes/$lang+/disaster-event+/$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-de-view@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const url = new URL(`${TEST_BASE_URL}/en/disaster-event/${params.id}`);
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

	it("should return disaster event by id", async () => {
		const data = await callLoader({ id: testData.disasterEventId });

		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(testData.disasterEventId);
	});

	it("should return 400 when id is missing", async () => {
		await expect(callLoader({ id: "" })).rejects.toMatchObject({
			status: 400,
		});
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callLoader({ id: testData.disasterEventId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 401 for disaster event from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterEventWithOptions(otherTenantId);

		await expect(
			callLoader({ id: otherData.disasterEventId }),
		).rejects.toMatchObject({ status: 401 });

		await cleanupOtherTenant();
	});

	it("should return disaster event with spatial footprints data", async () => {
		const data = await callLoader({ id: testData.disasterEventId });

		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(testData.disasterEventId);
	});
});
