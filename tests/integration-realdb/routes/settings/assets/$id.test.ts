import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { dr } from "~/db.server";
import { assetTable } from "~/drizzle/schema/assetTable";
import { eq } from "drizzle-orm";
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

setupSessionMocks();

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
	return asset;
}

async function cleanupTestAssets() {
	try {
		await dr
			.delete(assetTable)
			.where(eq(assetTable.countryAccountsId, testIds.countryAccountId));
	} catch (e) {}
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
		await cleanupTestAssets();
		await cleanupTestUser(testIds);
	});

	it("should throw for non-existent asset", async () => {
		await expect(callLoader({ id: randomUUID() })).rejects.toThrow(
			"Id is invalid",
		);
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
});
