import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-index@");

setupSessionMocks();

async function callLoader(params: { search?: string; builtIn?: string } = {}) {
	const { loader } = await import("~/routes/$lang+/settings+/assets+/_index");
	const searchParams = new URLSearchParams();
	if (params.search) searchParams.set("search", params.search);
	if (params.builtIn !== undefined) searchParams.set("builtIn", params.builtIn);
	const url = `${TEST_BASE_URL}/en/settings/assets${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
	const request = new Request(url);
	return await loader({
		request,
		params: { lang: "en" },
		context: {},
	} as any);
}

describe("_index.tsx loader", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);
	});

	afterEach(async () => {
		await cleanupTestAssets();
		await cleanupTestUser(testIds);
	});

	it("should return custom assets for tenant", async () => {
		const customAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const data = await callLoader({ builtIn: "false" });

		const itemIds = data.data.items.map((item: any) => item.id);
		expect(itemIds).toContain(customAsset.id);
	});

	it("should not return assets from other tenants", async () => {
		const otherTenantId = await createOtherTenant();
		const otherTenantAsset = await createTestAsset(otherTenantId, {
			isBuiltIn: false,
		});
		const ownAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const data = await callLoader({ builtIn: "false" });

		const itemIds = data.data.items.map((item: any) => item.id);
		expect(itemIds).toContain(ownAsset.id);
		expect(itemIds).not.toContain(otherTenantAsset.id);
	});

	it("should filter by builtIn=true to show only built-in assets", async () => {
		const builtInAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});
		const customAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const data = await callLoader({ builtIn: "true" });

		const itemIds = data.data.items.map((item: any) => item.id);
		expect(itemIds).toContain(builtInAsset.id);
		expect(itemIds).not.toContain(customAsset.id);
	});

	it("should filter by builtIn=false to show only custom assets", async () => {
		const builtInAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});
		const customAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});

		const data = await callLoader({ builtIn: "false" });

		const itemIds = data.data.items.map((item: any) => item.id);
		expect(itemIds).not.toContain(builtInAsset.id);
		expect(itemIds).toContain(customAsset.id);
	});

	it("should filter by search term", async () => {
		const asset1 = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
			customName: "Unique Asset Name",
		});
		const asset2 = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
			customName: "Different Asset",
		});

		const data = await callLoader({ search: "Unique" });

		const itemIds = data.data.items.map((item: any) => item.id);
		expect(itemIds).toContain(asset1.id);
		expect(itemIds).not.toContain(asset2.id);
	});

	it("should return pagination data", async () => {
		await createTestAsset(testIds.countryAccountId, { isBuiltIn: false });
		await createTestAsset(testIds.countryAccountId, { isBuiltIn: false });

		const data = await callLoader();

		expect(data.data.pagination).toBeDefined();
		expect(data.data.pagination.totalItems).toBeGreaterThanOrEqual(2);
	});

	it("should return filters in response", async () => {
		const data = await callLoader({ search: "test", builtIn: "false" });

		expect(data.filters).toBeDefined();
		expect(data.filters.search).toBe("test");
		expect(data.filters.builtIn).toBe(false);
	});

	it("should return sector names for assets", async () => {
		const { dr } = await import("~/db.server");
		const { sectorTable } = await import("~/drizzle/schema/sectorTable");

		const sectors = await dr
			.select({ id: sectorTable.id })
			.from(sectorTable)
			.limit(2);

		if (sectors.length < 2) {
			throw new Error("Not enough sectors in database for test");
		}

		const asset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
			sectorIds: `${sectors[0].id},${sectors[1].id}`,
		});

		const data = await callLoader({ builtIn: "false" });

		const item = data.data.items.find((item: any) => item.id === asset.id);
		expect(item).toBeDefined();
		expect(item!.sectorNames).toBeDefined();
		expect(item!.sectorNames.length).toBeGreaterThan(0);
		expect(item!.sectorNames).toContain(", ");
	});
});
