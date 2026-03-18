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

	it("should return empty item for new asset", async () => {
		const data = await callLoader({ id: "new" });
		expect(data).toBeDefined();
		expect(data.item).toBeNull();
		expect(data.fieldsDef).toBeDefined();
	});

	it("should return asset data for existing asset with matching tenant", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const data = await callLoader({ id: asset.id });
		expect(data).toBeDefined();
		expect(data.item).toBeDefined();
		expect(data.item!.id).toBe(asset.id);
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

	it("should create new asset", async () => {
		const response = await callAction(
			{ id: "new" },
			{
				name: "New Test Asset",
				category: "Test Category",
				notes: "Test Notes",
			},
		);

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(302);
		const location = (response as Response).headers.get("Location");
		expect(location).toMatch(/\/settings\/assets\/[a-f0-9-]+$/);
	});

	it("should update existing asset", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const response = await callAction(
			{ id: asset.id },
			{
				name: "Updated Asset Name",
				category: "Updated Category",
			},
		);

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(302);
		const location = (response as Response).headers.get("Location");
		expect(location).toBe(`/settings/assets/${asset.id}`);
	});

	it("should throw error when updating non-existent asset", async () => {
		await expect(
			callAction({ id: randomUUID() }, { name: "Test" }),
		).rejects.toThrow();
	});

	it("should throw error when updating built-in asset", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});

		await expect(
			callAction({ id: asset.id }, { name: "Test" }),
		).rejects.toThrow("builtin");
	});

	it("should throw error when updating asset from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const asset = await createTestAsset(otherTenantId, { isBuiltIn: false });

		await expect(
			callAction({ id: asset.id }, { name: "Test" }),
		).rejects.toThrow();
	});

	it("should return validation error for missing required field", async () => {
		const response = await callAction(
			{ id: "new" },
			{
				category: "Test Category",
			},
		);

		expect(response).not.toBeInstanceOf(Response);
		expect((response as any).ok).toBe(false);
		expect((response as any).errors).toBeDefined();
	});
});
