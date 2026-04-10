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
import { loader as viewLoader } from "~/routes/$lang+/disaster-record+/$id";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-dr-view@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const url = new URL(`${TEST_BASE_URL}/en/disaster-record/${params.id}`);
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

	it("should return disaster record by id", async () => {
		const data = await callLoader({ id: testData.disasterRecordId });

		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(testData.disasterRecordId);
	});

	it("should return 400 when id is missing", async () => {
		await expect(callLoader({ id: "" })).rejects.toMatchObject({ status: 400 });
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callLoader({ id: testData.disasterRecordId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 404 for disaster record from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterRecordWithEvent(otherTenantId);

		await expect(
			callLoader({ id: otherData.disasterRecordId }),
		).rejects.toMatchObject({ status: 404 });

		await cleanupOtherTenant();
	});

	it("should return record with disaster event info", async () => {
		const data = await callLoader({ id: testData.disasterRecordId });

		expect(data.item.disasterEventId).toBe(testData.disasterEventId);
	});
});
