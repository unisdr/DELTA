import { dr } from "~/db.server";
import { lossesTable } from "~/drizzle/schema/lossesTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { sectorTable } from "~/drizzle/schema/sectorTable";
import { inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export const createdLossesIds: string[] = [];
export const createdDisasterRecordIds: string[] = [];
export const createdSectorIds: string[] = [];

export async function createTestLosses(
	countryAccountId: string,
	overrides: Record<string, any> = {},
) {
	const [sector] = await dr
		.select({ id: sectorTable.id })
		.from(sectorTable)
		.limit(1);

	if (!sector) {
		throw new Error("No sector found in database");
	}
	createdSectorIds.push(sector.id);

	const [disasterRecord] = await dr
		.insert(disasterRecordsTable)
		.values({
			id: randomUUID(),
			countryAccountsId: countryAccountId,
			originatorRecorderInst: "Test Institution",
			validatedBy: "Test Validator",
			startDate: "2023-01-01",
			endDate: "2023-01-02",
		})
		.returning();
	createdDisasterRecordIds.push(disasterRecord.id);

	const [losses] = await dr
		.insert(lossesTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
			sectorId: overrides.sectorId || sector.id,
			sectorIsAgriculture: false,
			attachments: [],
			...overrides,
		})
		.returning();
	createdLossesIds.push(losses.id);

	return {
		lossesId: losses.id,
		disasterRecordId: disasterRecord.id,
		sectorId: overrides.sectorId || sector.id,
	};
}

export async function cleanupTestLosses() {
	if (createdLossesIds.length > 0) {
		try {
			await dr
				.delete(lossesTable)
				.where(inArray(lossesTable.id, createdLossesIds));
		} catch (e) {}
	}
	if (createdDisasterRecordIds.length > 0) {
		try {
			await dr
				.delete(disasterRecordsTable)
				.where(inArray(disasterRecordsTable.id, createdDisasterRecordIds));
		} catch (e) {}
	}
	createdLossesIds.length = 0;
	createdDisasterRecordIds.length = 0;
	createdSectorIds.length = 0;
}
