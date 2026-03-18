import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "crypto";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import {
	createTestAsset,
	createOtherTenant,
	cleanupTestAssets,
	createTestDamageRecord,
} from "./test-helpers";
import { action as deleteAction } from "~/routes/$lang+/settings+/assets+/delete.$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-delete@");

setupSessionMocks();

async function callAction(params: { id: string }) {
	const form = new URLSearchParams({ _action: "delete" });
	const request = new Request(
		`${TEST_BASE_URL}/en/settings/assets/delete/${params.id}`,
		{
			method: "POST",
			body: form,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		},
	);
	return await deleteAction({
		request,
		params: { lang: "en", ...params },
		context: {},
	} as any);
}

describe("delete.$id.tsx action", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);
	});

	afterEach(async () => {
		await cleanupTestAssets();
		await cleanupTestUser(testIds);
	});

	it("should throw 404 for non-existent asset", async () => {
		await expect(callAction({ id: randomUUID() })).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should delete asset with matching tenant", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const response = await callAction({ id: asset.id });

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(302);
		const location = (response as Response).headers.get("Location");
		expect(location).toBe("/settings/assets");
	});

	it("should throw 403 when deleting asset from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const asset = await createTestAsset(otherTenantId, { isBuiltIn: false });

		await expect(callAction({ id: asset.id })).rejects.toMatchObject({
			status: 403,
		});
	});

	it("should throw 403 when deleting built-in asset", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});

		await expect(callAction({ id: asset.id })).rejects.toMatchObject({
			status: 403,
		});
	});

	it("should return error when deleting asset in use", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});
		await createTestDamageRecord(testIds.countryAccountId, asset.id);

		const response = await callAction({ id: asset.id });
		expect(response).toMatchObject({
			error: "Cannot delete this asset - it is used in damages",
		});
	});
});
