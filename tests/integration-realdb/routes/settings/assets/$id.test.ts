import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { dr } from "~/db.server";
import { assetTable } from "~/drizzle/schema/assetTable";
import { countryAccounts } from "~/drizzle/schema/countryAccounts";
import { inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";

const testIds = createTestIds();
const TEST_COUNTRY_ID = "3e8cc2da-7ac4-43ff-953c-867976c3f5e0";

setupSessionMocks();

const createdAssetIds: string[] = [];
const createdCountryAccountIds: string[] = [];

async function createTestAsset(overrides: Record<string, any> = {}) {
	const [asset] = await dr
		.insert(assetTable)
		.values({
			id: randomUUID(),
			sectorIds: "",
			isBuiltIn: false,
			customName: "Test Asset",
			countryAccountsId: testIds.countryAccountId,
			...overrides,
		})
		.returning();
	createdAssetIds.push(asset.id);
	return asset;
}

async function createOtherTenant() {
	const id = randomUUID();
	await dr.insert(countryAccounts).values({
		id,
		shortDescription: "Other Tenant",
		countryId: TEST_COUNTRY_ID,
		status: 1,
		type: "Training",
	});
	createdCountryAccountIds.push(id);
	return id;
}

async function cleanupTestData() {
	if (createdAssetIds.length > 0) {
		try {
			await dr
				.delete(assetTable)
				.where(inArray(assetTable.id, createdAssetIds));
		} catch (e) {}
	}
	if (createdCountryAccountIds.length > 0) {
		try {
			await dr
				.delete(countryAccounts)
				.where(inArray(countryAccounts.id, createdCountryAccountIds));
		} catch (e) {}
	}
	createdAssetIds.length = 0;
	createdCountryAccountIds.length = 0;
}

async function callLoader(params: { id: string }) {
	const { loader } = await import("~/routes/$lang+/settings+/assets+/$id");
	const request = new Request(
		`${TEST_BASE_URL}/en/settings/assets/${params.id}`,
	);
	return await loader({
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
		await cleanupTestData();
		await cleanupTestUser(testIds);
	});

	it("should throw 404 for non-existent asset", async () => {
		await expect(callLoader({ id: randomUUID() })).rejects.toMatchObject({
			status: 404,
		});
	});

	it("should return asset data for existing built-in asset", async () => {
		const asset = await createTestAsset({ isBuiltIn: true });

		const data = await callLoader({ id: asset.id });
		expect(data).toBeDefined();
		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(asset.id);
	});

	it("should return asset data for instance-owned asset with matching tenant", async () => {
		const asset = await createTestAsset({ isBuiltIn: false });

		const data = await callLoader({ id: asset.id });
		expect(data).toBeDefined();
		expect(data.item).toBeDefined();
		expect(data.item.id).toBe(asset.id);
	});

	it("should throw 403 for instance-owned asset with different tenant", async () => {
		const otherTenantId = await createOtherTenant();

		const asset = await createTestAsset({
			isBuiltIn: false,
			countryAccountsId: otherTenantId,
		});

		await expect(callLoader({ id: asset.id })).rejects.toMatchObject({
			status: 403,
		});
	});
});
