import { dr } from "~/db.server";
import { lossesTable } from "~/drizzle/schema/lossesTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { randomUUID } from "crypto";

const PRODUCTIVE_SECTOR_ID = "7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a";

export async function createTestLosses(
	countryAccountId: string,
	overrides: Record<string, any> = {},
) {
	const sectorId = overrides.sectorId || PRODUCTIVE_SECTOR_ID;

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

	const [losses] = await dr
		.insert(lossesTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
			sectorId: sectorId,
			sectorIsAgriculture: false,
			attachments: [],
			...overrides,
		})
		.returning();

	return {
		lossesId: losses.id,
		disasterRecordId: disasterRecord.id,
		sectorId: sectorId,
	};
}
