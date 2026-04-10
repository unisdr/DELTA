import { dr } from "~/db.server";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { hipTypeTable } from "~/drizzle/schema/hipTypeTable";
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { randomUUID } from "crypto";

async function getOrCreateHipData() {
	let hipType = await dr.query.hipTypeTable.findFirst();

	if (!hipType) {
		const [newType] = await dr
			.insert(hipTypeTable)
			.values({ id: "test-type-1", name: { en: "Test Type" } })
			.returning();
		hipType = newType;

		const [newCluster] = await dr
			.insert(hipClusterTable)
			.values({
				id: "test-cluster-1",
				typeId: hipType.id,
				name: { en: "Test Cluster" },
			})
			.returning();

		await dr.insert(hipHazardTable).values({
			id: "test-hazard-1",
			clusterId: newCluster.id,
			name: { en: "Test Hazard" },
		});
	}

	let hipCluster = await dr.query.hipClusterTable.findFirst({
		where: (clusters, { eq }) => eq(clusters.typeId, hipType!.id),
	});

	let hipHazard = await dr.query.hipHazardTable.findFirst({
		where: (hazards, { eq }) => eq(hazards.clusterId, hipCluster!.id),
	});

	return {
		hipTypeId: hipType!.id,
		hipClusterId: hipCluster!.id,
		hipHazardId: hipHazard!.id,
	};
}

export async function createTestHazardousEvent(countryAccountId: string) {
	const eventId = randomUUID();
	const hipData = await getOrCreateHipData();

	await dr.insert(eventTable).values({
		id: eventId,
		name: "Test Hazardous Event",
		description: "Test Hazardous Event Description",
	});

	const [hazardousEvent] = await dr
		.insert(hazardousEventTable)
		.values({
			id: eventId,
			countryAccountsId: countryAccountId,
			hipTypeId: hipData.hipTypeId,
			hipClusterId: hipData.hipClusterId,
			hipHazardId: hipData.hipHazardId,
			status: "pending",
			approvalStatus: "published",
			attachments: [],
		})
		.returning();

	return {
		hazardousEventId: hazardousEvent.id,
		hazardousEvent,
		event: { id: eventId },
	};
}

export async function createTestHazardousEventWithOptions(
	countryAccountId: string,
	options: {
		approvalStatus?: string;
		status?: string;
		description?: string;
		hipHazardId?: string;
		hipClusterId?: string;
		hipTypeId?: string;
	} = {},
) {
	const eventId = randomUUID();
	const hipData = await getOrCreateHipData();

	await dr.insert(eventTable).values({
		id: eventId,
		name: options.description || "Test Hazardous Event",
		description: "Test Hazardous Event Description",
	});

	const [hazardousEvent] = await dr
		.insert(hazardousEventTable)
		.values({
			id: eventId,
			countryAccountsId: countryAccountId,
			hipTypeId: options.hipTypeId || hipData.hipTypeId,
			hipClusterId: options.hipClusterId || hipData.hipClusterId,
			hipHazardId: options.hipHazardId || hipData.hipHazardId,
			status: options.status || "pending",
			approvalStatus: (options.approvalStatus as any) || "published",
			description: options.description || "Test Hazardous Event",
			attachments: [],
		})
		.returning();

	return {
		hazardousEventId: hazardousEvent.id,
		hazardousEvent,
		event: { id: eventId },
	};
}
