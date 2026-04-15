// Test utilities for human effects integration tests.
// See _docs/human-direct-effects.md for overview.
import { dr } from "~/db.server";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { humanDsgTable } from "~/drizzle/schema/humanDsgTable";
import { deathsTable } from "~/drizzle/schema/deathsTable";
import { humanCategoryPresenceTable } from "~/drizzle/schema/humanCategoryPresenceTable";
import { randomUUID } from "crypto";

export async function createTestHumanEffects(countryAccountId: string) {
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

	const [dsg] = await dr
		.insert(humanDsgTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
		})
		.returning();

	const [deaths] = await dr
		.insert(deathsTable)
		.values({
			id: randomUUID(),
			dsgId: dsg.id,
			deaths: 0,
		})
		.returning();

	const [categoryPresence] = await dr
		.insert(humanCategoryPresenceTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
		})
		.returning();

	return {
		disasterRecordId: disasterRecord.id,
		dsgId: dsg.id,
		deathsId: deaths.id,
		categoryPresenceId: categoryPresence.id,
	};
}

export async function createTestHumanEffectsWithData(
	countryAccountId: string,
	_tableType: "Deaths" | "Injured" | "Missing" | "Affected" | "Displaced",
	_data: Record<string, any> = {},
) {
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

	const [dsg] = await dr
		.insert(humanDsgTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
		})
		.returning();

	const [categoryPresence] = await dr
		.insert(humanCategoryPresenceTable)
		.values({
			id: randomUUID(),
			recordId: disasterRecord.id,
		})
		.returning();

	return {
		disasterRecordId: disasterRecord.id,
		dsgId: dsg.id,
		categoryPresenceId: categoryPresence.id,
	};
}
