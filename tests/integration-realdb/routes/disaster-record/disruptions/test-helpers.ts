import { dr } from "~/db.server";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { sectorTable } from "~/drizzle/schema/sectorTable";
import { randomUUID } from "crypto";

export async function createTestDisruption(
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
			sectorId: overrides.sectorId || sector.id,
			attachments: [],
			...overrides,
		})
		.returning();

	return {
		disruptionId: disruption.id,
		disasterRecordId: disasterRecord.id,
		sectorId: overrides.sectorId || sector.id,
	};
}
