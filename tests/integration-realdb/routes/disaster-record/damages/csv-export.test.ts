import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { createTestDamage } from "./test-helpers";
import { loader as csvExportLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/damages+/csv-export";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-csv-export@");

setupSessionMocks();

describe("csv-export.ts loader", () => {
	let testDamageId: string;
	let testDisasterRecordId: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestDamage(testIds.countryAccountId);
		testDamageId = result.damageId;
		testDisasterRecordId = result.disasterRecordId;
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should export damages as CSV", async () => {
		const url = `${TEST_BASE_URL}/en/disaster-record/edit/${testDisasterRecordId}/damages/csv-export`;
		const request = new Request(url);
		const result = await csvExportLoader({
			request,
			params: { lang: "en", disRecId: testDisasterRecordId },
			context: {},
		} as any);

		expect(result.status).toBe(200);
		expect(result.headers.get("Content-Type")).toBe("text/csv");

		const csvText = await result.text();
		expect(csvText).toBeDefined();
		expect(csvText.length).toBeGreaterThan(0);
	});

	it("should include damage IDs in CSV", async () => {
		const url = `${TEST_BASE_URL}/en/disaster-record/edit/${testDisasterRecordId}/damages/csv-export`;
		const request = new Request(url);
		const result = await csvExportLoader({
			request,
			params: { lang: "en", disRecId: testDisasterRecordId },
			context: {},
		} as any);

		const csvText = await result.text();
		expect(csvText).toContain(testDamageId);
	});
});
