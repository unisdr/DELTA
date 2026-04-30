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
} from "./test-helpers";
import {
	loader as editLoader,
	action as editAction,
} from "~/routes/$lang+/settings+/assets+/edit.$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-edit@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const request = new Request(
		`${TEST_BASE_URL}/en/settings/assets/edit/${params.id}`,
	);
	return await editLoader({
		request,
		params: { lang: "en", ...params },
		context: {},
	} as any);
}

async function callAction(
	params: { id: string },
	formData: Record<string, string>,
) {
	const form = new URLSearchParams(formData);
	const request = new Request(
		`${TEST_BASE_URL}/en/settings/assets/edit/${params.id}`,
		{
			method: "POST",
			body: form,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		},
	);
	return await editAction({
		request,
		params: { lang: "en", ...params },
		context: {},
	} as any);
}

describe("edit.$id.tsx loader", () => {
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
		await expect(callLoader({ id: randomUUID() })).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should return asset data for existing asset with matching tenant", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const data = await callLoader({ id: asset.id });
		expect(data).toBeDefined();
		expect(data.item).toBeDefined();
		expect(data.item!.id).toBe(asset.id);
		expect(data.selectedDisplay).toBeDefined();
	});

	it("should throw 403 for asset with different tenant", async () => {
		const otherTenantId = await createOtherTenant();

		const asset = await createTestAsset(otherTenantId, { isBuiltIn: false });

		await expect(callLoader({ id: asset.id })).rejects.toMatchObject({
			status: 403,
		});
	});

	it("should throw 403 for built-in asset", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});

		await expect(callLoader({ id: asset.id })).rejects.toMatchObject({
			status: 403,
		});
	});
});

describe("edit.$id.tsx action", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);
	});

	afterEach(async () => {
		await cleanupTestAssets();
		await cleanupTestUser(testIds);
	});

	it("should update existing asset", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const response = await callAction(
			{ id: asset.id },
			{
				customName: "Updated Asset Name",
				customCategory: "Updated Category",
			},
		);

		expect(response).not.toBeInstanceOf(Response);
		expect(response).toEqual({ ok: true });
	});

	it("should return error when updating non-existent asset", async () => {
		const response = await callAction(
			{ id: randomUUID() },
			{ customName: "Test" },
		);

		expect(response).toMatchObject({
			ok: false,
			error: "Asset not found or cannot be edited",
		});
	});

	it("should return error when updating built-in asset", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});

		const response = await callAction({ id: asset.id }, { customName: "Test" });

		expect(response).toMatchObject({
			ok: false,
			error: "Asset not found or cannot be edited",
		});
	});

	it("should return error when updating asset from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const asset = await createTestAsset(otherTenantId, { isBuiltIn: false });

		const response = await callAction({ id: asset.id }, { customName: "Test" });

		expect(response).toMatchObject({
			ok: false,
			error: "Asset not found or cannot be edited",
		});
	});

	it("should return validation error for missing required field", async () => {
		const response = await callAction(
			{ id: randomUUID() },
			{
				customCategory: "Test Category",
			},
		);

		expect(response).not.toBeInstanceOf(Response);
		expect((response as any).ok).toBe(false);
		expect((response as any).errors).toBeDefined();
	});
});
