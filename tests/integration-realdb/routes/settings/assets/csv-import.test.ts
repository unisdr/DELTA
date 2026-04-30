import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { cleanupTestAssets } from "./test-helpers";
import { action as csvImportAction } from "~/routes/$lang+/settings+/assets+/csv-import";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-csv-import@");

setupSessionMocks();

async function callAction(formData: FormData) {
	const request = new Request(
		`${TEST_BASE_URL}/en/settings/assets/csv-import`,
		{
			method: "POST",
			body: formData,
		},
	);
	return await csvImportAction({
		request,
		params: { lang: "en" },
		context: {},
	} as any);
}

describe("csv-import.tsx action", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);
	});

	afterEach(async () => {
		await cleanupTestAssets();
		await cleanupTestUser(testIds);
	});

	it("should create asset from CSV", async () => {
		const csvContent =
			"name,category,notes\nTest Asset,Test Category,Test Notes";
		const file = new File([csvContent], "test.csv", { type: "text/csv" });

		const formData = new FormData();
		formData.append("file", file);
		formData.append("import_type", "create");

		const response = await callAction(formData);
		expect(response).toBeDefined();
		expect(response.imported).toBe(1);
		expect(response.res.ok).toBe(true);
	});

	it("should return error for missing CSV file", async () => {
		const formData = new FormData();
		formData.append("import_type", "create");

		const response = await callAction(formData);
		expect(response).toBeDefined();
		expect(response.res.ok).toBe(false);
	});
});
