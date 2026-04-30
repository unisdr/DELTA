
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { hipTypeTable } from "~/drizzle/schema/hipTypeTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { dr, Tx } from "~/db.server";
import { eq, and, sql } from "drizzle-orm";
import type { BackendContext } from "../../context";

export async function disasterEventIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: disasterEventTable.id,
		})
		.from(disasterEventTable)
		.where(and(eq(disasterEventTable.apiImportId, importId)));
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}
export async function disasterEventIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string,
) {
	const res = await tx
		.select({
			id: disasterEventTable.id,
		})
		.from(disasterEventTable)
		.where(
			and(
				eq(disasterEventTable.apiImportId, importId),
				eq(disasterEventTable.countryAccountsId, countryAccountsId),
			),
		);
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}

export type DisasterEventViewModel = Exclude<
	Awaited<ReturnType<typeof disasterEventById>>,
	undefined
>;

export async function disasterEventById(ctx: BackendContext, id: any) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	const disasterEvent = await dr.query.disasterEventTable.findFirst({
		where: and(eq(disasterEventTable.id, id)),
	});

	if (!disasterEvent) {
		throw new Error("Id is invalid");
	}

	// Then load related data in separate queries to avoid argument limit
	const [hazardousEvent, hipHazard, hipCluster, hipType, event] =
		await Promise.all([
			disasterEvent.hazardousEventId
				? dr.query.hazardousEventTable.findFirst({
						where: eq(hazardousEventTable.id, disasterEvent.hazardousEventId),
					})
				: Promise.resolve(null),
			disasterEvent.hipHazardId
				? dr.query.hipHazardTable.findFirst({
						columns: {
							id: true,
						},
						extras: {
							name: sql<string>`dts_jsonb_localized(${hipHazardTable.name}, ${ctx.lang})`.as(
								"name",
							),
						},
						where: eq(hipHazardTable.id, disasterEvent.hipHazardId),
					})
				: Promise.resolve(null),
			disasterEvent.hipClusterId
				? dr.query.hipClusterTable.findFirst({
						columns: {
							id: true,
						},
						extras: {
							name: sql<string>`dts_jsonb_localized(${hipClusterTable.name}, ${ctx.lang})`.as(
								"name",
							),
						},
						where: eq(hipClusterTable.id, disasterEvent.hipClusterId),
					})
				: Promise.resolve(null),
			disasterEvent.hipTypeId
				? dr.query.hipTypeTable.findFirst({
						columns: {
							id: true,
						},
						extras: {
							name: sql<string>`dts_jsonb_localized(${hipTypeTable.name}, ${ctx.lang})`.as(
								"name",
							),
						},
						where: eq(hipTypeTable.id, disasterEvent.hipTypeId),
					})
				: Promise.resolve(null),
			dr.query.eventTable.findFirst({
				where: eq(eventTable.id, id),
			}),
		]);

	return {
		...disasterEvent,
		hazardousEvent: hazardousEvent || undefined,
		hipHazard: hipHazard || undefined,
		hipCluster: hipCluster || undefined,
		hipType: hipType || undefined,
		event: event || undefined,
		disasterEvent: disasterEvent, // Self-reference for backward compatibility
	};
}

export type DisasterEventBasicInfoViewModel = Exclude<
	Awaited<ReturnType<typeof disasterEventBasicInfoById>>,
	undefined
>;

export async function disasterEventBasicInfoById(
	id: any,
	countryAccountsId?: string,
) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}
	const res = await dr.query.disasterEventTable.findFirst({
		where: countryAccountsId
			? and(
					eq(disasterEventTable.id, id),
					eq(disasterEventTable.countryAccountsId, countryAccountsId),
				)
			: eq(disasterEventTable.id, id),
	});
	return res;
}

