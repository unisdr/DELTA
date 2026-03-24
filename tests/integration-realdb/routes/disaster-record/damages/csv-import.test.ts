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
import { action as csvImportAction } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/damages+/csv-import";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-csv-import@");

setupSessionMocks();

async function callAction(formData: FormData, disRecId: string) {
	const request = new Request(
		`${TEST_BASE_URL}/en/disaster-record/edit-sub/${disRecId}/damages/csv-import`,
		{
			method: "POST",
			body: formData,
		},
	);
	return await csvImportAction({
		request,
		params: { lang: "en", disRecId },
		context: {},
	} as any);
}

describe("csv-import.tsx action", () => {
	let testDisasterIds: {
		disasterRecordId: string;
		sectorId: string;
		assetId: string;
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestDamage(testIds.countryAccountId);
		testDisasterIds = {
			disasterRecordId: result.disasterRecordId,
			sectorId: result.sectorId,
			assetId: result.assetId,
		};
	});

	afterEach(async () => {
		await cleanupTestDamages();
		await cleanupTestUser(testIds);
	});

	it("should create damage from CSV", async () => {
		const csvContent = `recordId,sectorId,assetId\n${testDisasterIds.disasterRecordId},${testDisasterIds.sectorId},${testDisasterIds.assetId}`;
		const file = new File([csvContent], "test.csv", { type: "text/csv" });

		const formData = new FormData();
		formData.append("file", file);
		formData.append("import_type", "create");

		const response = await callAction(
			formData,
			testDisasterIds.disasterRecordId,
		);
		expect(response).toBeDefined();
		expect(response.imported).toBe(1);
		expect(response.res.ok).toBe(true);
	});

	it("should return error for missing CSV file", async () => {
		const formData = new FormData();
		formData.append("import_type", "create");

		const response = await callAction(
			formData,
			testDisasterIds.disasterRecordId,
		);
		expect(response).toBeDefined();
		expect(response.res.ok).toBe(false);
	});
});
