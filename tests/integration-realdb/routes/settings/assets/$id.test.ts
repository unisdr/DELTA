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
import { loader as viewLoader } from "~/routes/$lang+/settings+/assets+/$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-view@");

setupSessionMocks();

async function callLoader(params: { id: string }) {
	const request = new Request(
		`${TEST_BASE_URL}/en/settings/assets/${params.id}`,
	);
	return await viewLoader({
		request,
		params: { lang: "en", ...params },
		context: {},
	} as any);
}

describe("$id.tsx loader", () => {
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

	it("should return asset data for existing built-in asset", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});

		const data = await callLoader({ id: asset.id });
		expect(data).toBeDefined();
		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(asset.id);
	});

	it("should return asset data for instance-owned asset with matching tenant", async () => {
		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const data = await callLoader({ id: asset.id });
		expect(data).toBeDefined();
		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(asset.id);
	});

	it("should throw 403 for instance-owned asset with different tenant", async () => {
		const otherTenantId = await createOtherTenant();

		const asset = await createTestAsset(otherTenantId, { isBuiltIn: false });

		await expect(callLoader({ id: asset.id })).rejects.toMatchObject({
			status: 403,
		});
	});
});
