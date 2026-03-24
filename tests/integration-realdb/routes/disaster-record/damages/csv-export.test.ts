import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { createTestDamage, cleanupTestDamages } from "./test-helpers";
import { loader as csvExportLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/damages+/csv-export";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-csv-export@");

setupSessionMocks();

describe("csv-export.ts loader", () => {
	let testDamageIds: string[] = [];

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestDamage(testIds.countryAccountId);
		testDamageIds.push(result.damageId);
	});

	afterEach(async () => {
		await cleanupTestDamages();
		await cleanupTestUser(testIds);
		testDamageIds = [];
	});

	it("should export damages as CSV", async () => {
		const url = `${TEST_BASE_URL}/en/disaster-record/edit/${testIds.countryAccountId}/damages/csv-export`;
		const request = new Request(url);
		const result = await csvExportLoader({
			request,
			params: { lang: "en", disRecId: testIds.countryAccountId },
			context: {},
		} as any);

		expect(result.status).toBe(200);
		expect(result.headers.get("Content-Type")).toBe("text/csv");

		const csvText = await result.text();
		expect(csvText).toBeDefined();
		expect(csvText.length).toBeGreaterThan(0);
	});

	it("should include damage IDs in CSV", async () => {
		const url = `${TEST_BASE_URL}/en/disaster-record/edit/${testIds.countryAccountId}/damages/csv-export`;
		const request = new Request(url);
		const result = await csvExportLoader({
			request,
			params: { lang: "en", disRecId: testIds.countryAccountId },
			context: {},
		} as any);

		const csvText = await result.text();
		expect(csvText).toContain(testDamageIds[0]);
	});
});
