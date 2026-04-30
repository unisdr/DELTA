import { dr } from "~/db.server";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { randomUUID } from "crypto";

const PRODUCTIVE_SECTOR_ID = "7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a";

export async function createTestDisruption(
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

	const [disruption] = await dr
		.insert(disruptionTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
			sectorId: sectorId,
			attachments: [],
			...overrides,
		})
		.returning();

	return {
		disruptionId: disruption.id,
		disasterRecordId: disasterRecord.id,
		sectorId: sectorId,
	};
}
