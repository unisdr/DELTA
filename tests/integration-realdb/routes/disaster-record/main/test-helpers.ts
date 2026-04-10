import { dr } from "~/db.server";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { randomUUID } from "crypto";

export async function createTestDisasterRecord(countryAccountId: string) {
	const eventId = randomUUID();

	await dr.insert(eventTable).values({
		id: eventId,
		name: "Test Event",
		description: "Test Event Description",
	});

	const [disasterEvent] = await dr
		.insert(disasterEventTable)
		.values({
			id: eventId,
			countryAccountsId: countryAccountId,
			nameNational: "Test Disaster Event",
			startDate: "2023-01-01",
			endDate: "2023-01-02",
		})
		.returning();

	const [disasterRecord] = await dr
		.insert(disasterRecordsTable)
		.values({
			id: randomUUID(),
			countryAccountsId: countryAccountId,
			disasterEventId: disasterEvent.id,
			originatorRecorderInst: "Test Institution",
			validatedBy: "Test Validator",
			startDate: "2023-01-01",
			endDate: "2023-01-02",
			approvalStatus: "published",
		})
		.returning();

	return {
		disasterRecordId: disasterRecord.id,
		disasterEventId: disasterEvent.id,
		disasterRecord,
		disasterEvent,
	};
}

export async function createTestDisasterRecordWithEvent(
	countryAccountId: string,
	options: {
		approvalStatus?: string;
		nameNational?: string;
		startDate?: string;
		endDate?: string;
	} = {},
) {
	const eventId = randomUUID();

	await dr.insert(eventTable).values({
		id: eventId,
		name: options.nameNational || "Test Event",
		description: "Test Event Description",
	});

	const [disasterEvent] = await dr
		.insert(disasterEventTable)
		.values({
			id: eventId,
			countryAccountsId: countryAccountId,
			nameNational: options.nameNational || "Test Disaster Event",
			startDate: options.startDate || "2023-01-01",
			endDate: options.endDate || "2023-01-02",
		})
		.returning();

	const [disasterRecord] = await dr
		.insert(disasterRecordsTable)
		.values({
			id: randomUUID(),
			countryAccountsId: countryAccountId,
			disasterEventId: disasterEvent.id,
			originatorRecorderInst: "Test Institution",
			validatedBy: "Test Validator",
			startDate: options.startDate || "2023-01-01",
			endDate: options.endDate || "2023-01-02",
			approvalStatus: (options.approvalStatus as any) || "published",
			attachments: [],
		})
		.returning();

	return {
		disasterRecordId: disasterRecord.id,
		disasterEventId: disasterEvent.id,
		disasterRecord,
		disasterEvent,
	};
}

export async function createMultipleTestDisasterRecords(
	countryAccountId: string,
	count: number,
) {
	const results = [];
	for (let i = 0; i < count; i++) {
		const result = await createTestDisasterRecordWithEvent(countryAccountId, {
			nameNational: `Test Disaster Event ${i + 1}`,
		});
		results.push(result);
	}
	return results;
}
