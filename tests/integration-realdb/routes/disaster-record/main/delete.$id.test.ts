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
import { action as deleteAction } from "~/routes/$lang+/disaster-record+/delete.$id";
import { dr } from "~/db.server";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { eq } from "drizzle-orm";
import { requireUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { randomUUID } from "crypto";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-dr-delete@");

setupSessionMocks();

async function callAction(params: { id: string }) {
	const url = new URL(
		`${TEST_BASE_URL}/en/disaster-record/delete/${params.id}`,
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

	it("should return 401 for missing session", async () => {
		vi.mocked(requireUser).mockResolvedValueOnce(null as any);

		await expect(
			callAction({ id: testData.disasterRecordId }),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return 404 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callAction({ id: testData.disasterRecordId }),
		).rejects.toMatchObject({ status: 404 });
	});

	it("should return 404 for record from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherData = await createTestDisasterRecordWithEvent(otherTenantId);

		await expect(
			callAction({ id: otherData.disasterRecordId }),
		).rejects.toMatchObject({ status: 404 });

		await cleanupOtherTenant();
	});

	it("should return 404 for non-existent record", async () => {
		const nonExistentId = randomUUID();

		await expect(callAction({ id: nonExistentId })).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should successfully delete disaster record", async () => {
		const result = await callAction({ id: testData.disasterRecordId });

		expect(result).toBeDefined();

		const deletedRecord = await dr
			.select()
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.id, testData.disasterRecordId));
		expect(deletedRecord).toHaveLength(0);
	});
});
