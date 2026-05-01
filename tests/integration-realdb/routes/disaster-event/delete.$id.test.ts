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
import { dr } from "~/db.server";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { action as deleteAction } from "~/routes/$lang+/disaster-event+/delete.$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-de-delete@");

setupSessionMocks();

async function callAction(params: { id: string }) {
	const url = new URL(`${TEST_BASE_URL}/en/disaster-event/delete/${params.id}`);
	const formData = new FormData();
	formData.append("id", params.id);
	const request = new Request(url.toString(), {
		method: "POST",
		body: formData,
	});
	return await deleteAction({
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

describe("delete.$id.tsx action", () => {
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

	it("should return 401 for missing session", async () => {
		vi.mocked(requireUser).mockResolvedValueOnce(null as any);

		await expect(
			callAction({ id: testData.disasterEventId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callAction({ id: testData.disasterEventId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return error for event from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterEventWithOptions(otherTenantId);

		const result = await callAction({ id: otherData.disasterEventId });

		expect(result).toBeDefined();
		expect((result as any).error).toBeDefined();

		await cleanupOtherTenant();
	});

	it("should throw error for non-existent event", async () => {
		const nonExistentId = randomUUID();

		await expect(callAction({ id: nonExistentId })).rejects.toThrow();
	});

	it("should successfully delete disaster event", async () => {
		const result = await callAction({ id: testData.disasterEventId });

		expect(result).toBeDefined();

		const deletedEvent = await dr
			.select()
			.from(disasterEventTable)
			.where(eq(disasterEventTable.id, testData.disasterEventId));
		expect(deletedEvent).toHaveLength(0);
	});
});
