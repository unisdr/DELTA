import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "crypto";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
	createOtherTenant,
	cleanupOtherTenant,
} from "../../../test-helpers";
import { createTestDisruption } from "./test-helpers";
import { loader as idLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/disruptions+/$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-disruptions-id@");

setupSessionMocks();

async function callLoader(params: { disRecId: string; id: string }) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit/${params.disRecId}/disruptions/${params.id}`;
	const request = new Request(url);
	return await idLoader({
		request,
		params: { lang: "en", disRecId: params.disRecId, id: params.id },
		context: {},
	} as any);
}

describe("$id.tsx loader", () => {
	let testDisasterIds: {
		disasterRecordId: string;
		sectorId: string;
	};
	let testDisruptionId: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		await mockSessionValues(testIds);
		await createTestUser(testIds);

		const result = await createTestDisruption(testIds.countryAccountId);
		testDisasterIds = {
			disasterRecordId: result.disasterRecordId,
			sectorId: result.sectorId,
		};
		testDisruptionId = result.disruptionId;
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should return 404 for non-existent disruption record", async () => {
		await expect(
			callLoader({
				disRecId: testDisasterIds.disasterRecordId,
				id: randomUUID(),
			}),
		).rejects.toMatchObject({ status: 404 });
	});

	it("should return 404 for disruption from different tenant", async () => {
		const otherTenantId = await createOtherTenant();
		const otherResult = await createTestDisruption(otherTenantId);

		await expect(
			callLoader({
				disRecId: otherResult.disasterRecordId,
				id: otherResult.disruptionId,
			}),
		).rejects.toMatchObject({ status: 404 });

		await cleanupOtherTenant();
	});

	it("should return disruption data for existing disruption record", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
			id: testDisruptionId,
		});

		expect(data.item).toBeDefined();
		expect(data.item!.id).toBe(testDisruptionId);
	});

	it("should return field definitions", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
			id: testDisruptionId,
		});

		expect(data.fieldDef).toBeDefined();
		expect(Array.isArray(data.fieldDef)).toBe(true);
	});
});
