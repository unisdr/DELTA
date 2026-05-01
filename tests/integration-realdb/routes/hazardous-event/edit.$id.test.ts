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
import { loader as editLoader } from "~/routes/$lang+/hazardous-event+/edit.$id";
import { randomUUID } from "crypto";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-edit@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const url = new URL(`${TEST_BASE_URL}/en/hazardous-event/edit/${params.id}`);
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

	it("should return existing hazardous event", async () => {
		const data = await callLoader({ id: testData.hazardousEventId });

		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(testData.hazardousEventId);
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callLoader({ id: testData.hazardousEventId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should throw error for non-existent record", async () => {
		await expect(callLoader({ id: randomUUID() })).rejects.toThrow(
			"hazardous event not found",
		);
	});

	it("should return 401 for record from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestHazardousEventWithOptions(otherTenantId);

		await expect(
			callLoader({ id: otherData.hazardousEventId }),
		).rejects.toMatchObject({ status: 401 });

		await cleanupOtherTenant();
	});

	it("should return hip data for hazard picker", async () => {
		const data = await callLoader({ id: testData.hazardousEventId });

		expect(data.hip).toBeDefined();
	});

	it("should return treeData for divisions", async () => {
		const data = await callLoader({ id: testData.hazardousEventId });

		expect(data.treeData).toBeDefined();
	});

	it("should return user info", async () => {
		const data = await callLoader({ id: testData.hazardousEventId });

		expect(data.user).toBeDefined();
	});

	it("should return users with validator role", async () => {
		const data = await callLoader({ id: testData.hazardousEventId });

		expect(data.usersWithValidatorRole).toBeDefined();
		expect(Array.isArray(data.usersWithValidatorRole)).toBe(true);
	});
});
