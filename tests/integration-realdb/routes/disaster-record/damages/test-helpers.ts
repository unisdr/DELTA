import { dr } from "~/db.server";
import { assetTable } from "~/drizzle/schema/assetTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { randomUUID } from "crypto";

const PRODUCTIVE_SECTOR_ID = "7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a";

export async function createTestDamage(
	countryAccountId: string,
	overrides: Record<string, any> = {},
) {
	const sectorId = overrides.sectorId || PRODUCTIVE_SECTOR_ID;

	const [asset] = await dr
		.insert(assetTable)
		.values({
			id: randomUUID(),
			sectorIds: sectorId,
			isBuiltIn: false,
			customName: "Test Asset for Damage",
			countryAccountsId: countryAccountId,
		})
		.returning();

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

	const [damage] = await dr
		.insert(damagesTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
			sectorId: sectorId,
			assetId: asset.id,
			attachments: [],
			...overrides,
		})
		.returning();

	return {
		damageId: damage.id,
		disasterRecordId: disasterRecord.id,
		sectorId: sectorId,
		assetId: asset.id,
	};
}
