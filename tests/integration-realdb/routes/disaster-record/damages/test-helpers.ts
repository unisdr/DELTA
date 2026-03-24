import { dr } from "~/db.server";
import { assetTable } from "~/drizzle/schema/assetTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { sectorTable } from "~/drizzle/schema/sectorTable";
import { inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export const createdDamageIds: string[] = [];
export const createdDisasterRecordIds: string[] = [];
export const createdAssetIds: string[] = [];
export const createdSectorIds: string[] = [];

export async function createTestDamage(
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

	const [asset] = await dr
		.insert(assetTable)
		.values({
			id: randomUUID(),
			sectorIds: sector.id,
			isBuiltIn: false,
			customName: "Test Asset for Damage",
			countryAccountsId: countryAccountId,
		})
		.returning();
	createdAssetIds.push(asset.id);

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

	const [damage] = await dr
		.insert(damagesTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
			sectorId: overrides.sectorId || sector.id,
			assetId: asset.id,
			attachments: [],
			...overrides,
		})
		.returning();
	createdDamageIds.push(damage.id);

	return {
		damageId: damage.id,
		disasterRecordId: disasterRecord.id,
		sectorId: overrides.sectorId || sector.id,
		assetId: asset.id,
	};
}

export async function cleanupTestDamages() {
	if (createdDamageIds.length > 0) {
		try {
			await dr
				.delete(damagesTable)
				.where(inArray(damagesTable.id, createdDamageIds));
		} catch (e) {}
	}
	if (createdDisasterRecordIds.length > 0) {
		try {
			await dr
				.delete(disasterRecordsTable)
				.where(inArray(disasterRecordsTable.id, createdDisasterRecordIds));
		} catch (e) {}
	}
	if (createdAssetIds.length > 0) {
		try {
			await dr
				.delete(assetTable)
				.where(inArray(assetTable.id, createdAssetIds));
		} catch (e) {}
	}
	createdDamageIds.length = 0;
	createdDisasterRecordIds.length = 0;
	createdAssetIds.length = 0;
	createdSectorIds.length = 0;
}
