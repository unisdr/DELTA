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
import { loader as csvExportLoader } from "~/routes/$lang+/settings+/assets+/csv-export";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-csv-export@");

setupSessionMocks();

describe("csv-export.ts loader", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);
	});

	afterEach(async () => {
		await cleanupTestAssets();
		await cleanupTestUser(testIds);
	});

	it("should only export non-built-in assets from current tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherTenantAsset = await createTestAsset(otherTenantId, {
			isBuiltIn: false,
		});
		const ownAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: false,
		});
		const builtInAsset = await createTestAsset(testIds.countryAccountId, {
			isBuiltIn: true,
		});

		const url = `${TEST_BASE_URL}/en/settings/assets/csv-export`;
		const request = new Request(url);
		const result = await csvExportLoader({
			request,
			params: { lang: "en" },
			context: {},
		} as any);

		expect(result.status).toBe(200);
		expect(result.headers.get("Content-Type")).toBe("text/csv");

		const csvText = await result.text();
		expect(csvText).toBeDefined();
		expect(csvText.length).toBeGreaterThan(0);

		expect(csvText).toContain(ownAsset.id);
		expect(csvText).not.toContain(otherTenantAsset.id);
		expect(csvText).not.toContain(builtInAsset.id);
	});
});
