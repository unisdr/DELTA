import { dr } from "~/db.server";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { randomUUID } from "crypto";

export async function createTestDisasterEvent(countryAccountId: string) {
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
			approvalStatus: "published",
		})
		.returning();

	return {
		disasterEventId: disasterEvent.id,
		disasterEvent,
	};
}

export async function createTestDisasterEventWithOptions(
	countryAccountId: string,
	options: {
		approvalStatus?: string;
		nameNational?: string;
		nameGlobalOrRegional?: string;
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
			nameGlobalOrRegional: options.nameGlobalOrRegional || "",
			startDate: options.startDate || "2023-01-01",
			endDate: options.endDate || "2023-01-02",
			approvalStatus: (options.approvalStatus as any) || "published",
		})
		.returning();

	return {
		disasterEventId: disasterEvent.id,
		disasterEvent,
	};
}

export async function createMultipleTestDisasterEvents(
	countryAccountId: string,
	count: number,
) {
	const results = [];
	for (let i = 0; i < count; i++) {
		const result = await createTestDisasterEventWithOptions(countryAccountId, {
			nameNational: `Test Disaster Event ${i + 1}`,
		});
		results.push(result);
	}
	return results;
}
