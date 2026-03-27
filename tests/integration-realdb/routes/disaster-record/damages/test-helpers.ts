import { dr } from "~/db.server";
import { assetTable } from "~/drizzle/schema/assetTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { sectorTable } from "~/drizzle/schema/sectorTable";
import { randomUUID } from "crypto";

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
			sectorId: overrides.sectorId || sector.id,
			assetId: asset.id,
			attachments: [],
			...overrides,
		})
		.returning();

	return {
		damageId: damage.id,
		disasterRecordId: disasterRecord.id,
		sectorId: overrides.sectorId || sector.id,
		assetId: asset.id,
	};
}
