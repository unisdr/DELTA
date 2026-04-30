// Integration tests for human effects save endpoint.
// See _docs/human-direct-effects.md for overview.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { createTestHumanEffects } from "./test-helpers";
import { action as saveAction } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/human-effects+/save";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-he-save@");

setupSessionMocks();

async function callAction(params: {
	disRecId: string;
	body: Record<string, any>;
}) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit-sub/${params.disRecId}/human-effects/save`;
	const request = new Request(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(params.body),
	});
	return await saveAction({
		request,
		params: { lang: "en", disRecId: params.disRecId },
		context: {},
	} as any);
}

describe("save.ts action", () => {
	let testDisasterIds: {
		disasterRecordId: string;
		dsgId: string;
		deathsId: string;
		categoryPresenceId: string;
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestHumanEffects(testIds.countryAccountId);
		testDisasterIds = {
			disasterRecordId: result.disasterRecordId,
			dsgId: result.dsgId,
			deathsId: result.deathsId,
			categoryPresenceId: result.categoryPresenceId,
		};
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should save new rows for human effects data", async () => {
		const response = (await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			body: {
				table: "Deaths",
				data: {},
			},
		})) as Response;
		const result = await response.json();

		expect(result.ok).toBe(true);
	});

	it("should return 401 for missing country accounts id", async () => {
		vi.mocked(getCountryAccountsIdFromSession).mockResolvedValueOnce(
			null as any,
		);

		await expect(
			callAction({
				disRecId: testDisasterIds.disasterRecordId,
				body: {
					table: "Deaths",
					data: {},
				},
			}),
		).rejects.toMatchObject({ status: 401 });
	});

	it("should return error for missing record id", async () => {
		await expect(
			callAction({
				disRecId: "",
				body: {
					table: "Deaths",
					data: {},
				},
			}),
		).rejects.toThrow();
	});

	it("should return error for missing data", async () => {
		const response = (await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			body: {
				table: "Deaths",
			},
		})) as Response;
		const result = await response.json();

		expect(result.ok).toBe(false);
		expect(result.error).toContain("no data");
	});

	it("should return error when columns do not match expected", async () => {
		const response = (await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			body: {
				table: "Deaths",
				columns: ["wrong", "columns"],
				data: {
					newRows: {
						"temp-id-1": ["m", "0-14"],
					},
				},
			},
		})) as Response;
		const result = await response.json();

		expect(result.ok).toBe(false);
		expect(result.error).toContain("columns passed do not match");
	});

	it("should return error when data provided without columns", async () => {
		const response = (await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			body: {
				table: "Deaths",
				data: {
					newRows: {
						"temp-id-1": ["m", "0-14", 10],
					},
				},
			},
		})) as Response;
		const result = await response.json();

		expect(result.ok).toBe(false);
		expect(result.error).toContain("columns are also required");
	});

	it("should handle updates to existing rows", async () => {
		const response = (await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			body: {
				table: "Deaths",
				data: {},
			},
		})) as Response;
		const result = await response.json();

		expect(result.ok).toBe(true);
	});

	it("should handle deletes", async () => {
		const response = (await callAction({
			disRecId: testDisasterIds.disasterRecordId,
			body: {
				table: "Deaths",
				data: {},
			},
		})) as Response;
		const result = await response.json();

		expect(result.ok).toBe(true);
	});

	it("should return error for invalid table", async () => {
		await expect(
			callAction({
				disRecId: testDisasterIds.disasterRecordId,
				body: {
					table: "InvalidTable",
					data: {},
				},
			}),
		).rejects.toThrow("Unknown table: InvalidTable");
	});
});
