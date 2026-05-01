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
import { action as deleteAction } from "~/routes/$lang+/hazardous-event+/delete.$id";
import { dr } from "~/db.server";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-delete@");

setupSessionMocks();

async function callAction(params: { id: string }) {
	const url = new URL(
		`${TEST_BASE_URL}/en/hazardous-event/delete/${params.id}`,
	);
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
	} as any);
}

describe("delete.$id.tsx action", () => {
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

	it("should return 401 for missing session", async () => {
		vi.mocked(requireUser).mockResolvedValueOnce(null as any);

		await expect(
			callAction({ id: testData.hazardousEventId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 500 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callAction({ id: testData.hazardousEventId }),
		).rejects.toMatchObject({ status: 500 });
	});

	it("should return error for record from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestHazardousEventWithOptions(otherTenantId);

		const result = await callAction({ id: otherData.hazardousEventId });
		expect(result).toMatchObject({ error: expect.any(String) });

		await cleanupOtherTenant();
	});

	it("should throw error for non-existent record", async () => {
		const nonExistentId = randomUUID();

		await expect(callAction({ id: nonExistentId })).rejects.toThrow(
			"hazardous event not found",
		);
	});

	it("should successfully delete hazardous event", async () => {
		const result = await callAction({ id: testData.hazardousEventId });

		expect(result).toBeDefined();

		const deletedRecord = await dr
			.select()
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, testData.hazardousEventId));
		expect(deletedRecord).toHaveLength(0);
	});
});
