import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "crypto";
import {
	createTestIds,
	setupSessionMocks,
	createTestUser,
	cleanupTestUser,
	mockSessionValues,
	TEST_BASE_URL,
} from "../../../test-helpers";
import { createTestDamage, cleanupTestDamages } from "./test-helpers";
import { loader as idLoader } from "~/routes/$lang+/disaster-record+/edit-sub.$disRecId+/damages+/$id";

const testIds = createTestIds();
testIds.userEmail = testIds.userEmail.replace("@", "-id@");

setupSessionMocks();

async function callLoader(params: { disRecId: string; id: string }) {
	const url = `${TEST_BASE_URL}/en/disaster-record/edit/${params.disRecId}/damages/${params.id}`;
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
		assetId: string;
	};
	let testDamageIds: string[] = [];

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
		testDamageIds.push(result.damageId);
	});

	afterEach(async () => {
		await cleanupTestDamages();
		await cleanupTestUser(testIds);
		testDamageIds = [];
	});

	it("should return 404 for non-existent damage", async () => {
		await expect(
			callLoader({
				disRecId: testDisasterIds.disasterRecordId,
				id: randomUUID(),
			}),
		).rejects.toMatchObject({ status: 404 });
	});

	it("should return damage data for existing damage", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
			id: testDamageIds[0],
		});

		expect(data.item).toBeDefined();
		expect(data.item!.id).toBe(testDamageIds[0]);
	});

	it("should return def field definitions", async () => {
		const data = await callLoader({
			disRecId: testDisasterIds.disasterRecordId,
			id: testDamageIds[0],
		});

		expect(data.def).toBeDefined();
		expect(Array.isArray(data.def)).toBe(true);
	});
});
