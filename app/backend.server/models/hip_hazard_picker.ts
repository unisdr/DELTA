import { dr } from "~/db.server";
import { hipTypeTable, hipClusterTable, hipHazardTable } from "~/drizzle/schema";
import { BackendContext } from "../context";
import { sql } from "drizzle-orm";


export interface Type {
	id: string;
	name: string;
}

export interface Cluster {
	id: string;
	typeId: string;
	name: string;
}

export interface Hazard {
	id: string;
	clusterId: string;
	name: string;
}

export interface HipDataForHazardPicker {
	types: Type[]
	clusters: Cluster[]
	hazards: Hazard[]
}

export async function dataForHazardPicker(ctx: BackendContext): Promise<HipDataForHazardPicker> {
	const types: Type[] = await dr
		.select({
			id: hipTypeTable.id,
			name: sql<string>`COALESCE(${hipTypeTable.name}->>${ctx.lang}, NULL)`,
		})
		.from(hipTypeTable)
		.orderBy(sql`${hipTypeTable.name}->>${ctx.lang}`);

	const clusters: Cluster[] = await dr.select({
		id: hipClusterTable.id,
		typeId: hipClusterTable.typeId,
		name: sql<string>`COALESCE(${hipClusterTable.name}->>${ctx.lang}, NULL)`,
	}).from(hipClusterTable)
		.orderBy(sql`${hipClusterTable.name}->>${ctx.lang}`);

	const hazards: Hazard[] = await dr.select({
		id: hipHazardTable.id,
		clusterId: hipHazardTable.clusterId,
		name: sql<string>`COALESCE(${hipHazardTable.name}->>${ctx.lang}, NULL)`,
	}).from(hipHazardTable)
		.orderBy(sql`${hipHazardTable.name}->>${ctx.lang}`);


	return {
		types,
		clusters,
		hazards,
	};
}

interface HIPFields {
	hipTypeId?: null | string
	hipClusterId?: null | string
	hipHazardId?: null | string
}


// When updating hip fields, make sure they are all updated at the same time. So if csv,api,form sets one only on update, others will be unset. Also validates that parent is set in child is set.
export function getRequiredAndSetToNullHipFields(fields: HIPFields): "type" | "cluster" | "" {
	if (fields.hipTypeId || fields.hipClusterId || fields.hipHazardId) {
		if (!fields.hipTypeId) {
			fields.hipTypeId = null
		}
		if (!fields.hipClusterId) {
			fields.hipClusterId = null
		}
		if (!fields.hipHazardId) {
			fields.hipHazardId = null
		}
	}
	if (fields.hipHazardId) {
		if (!fields.hipClusterId) {
			return "cluster"
		}
	}
	if (fields.hipClusterId) {
		if (!fields.hipTypeId) {
			return "type"
		}
	}
	return ""
}
