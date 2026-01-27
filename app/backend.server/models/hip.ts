import { dr } from '~/db.server';
import {
	hipTypeTable,
	hipClusterTable,
	hipHazardTable,
} from '~/drizzle/schema';
import { eq, sql } from "drizzle-orm";
import { BackendContext } from '../context';

export interface Hip {
	//type: string
	id: number
	title: string
	description: string
	notation: string
	cluster_id: number
	cluster_name: string
	type_id: number
	type_name: string
}

export interface HipApi {
	last_page: number
	data: Hip[]
}

export async function getHazardById(
	ctx: BackendContext,
	id: string
) {
	const rows = await dr
		.select({
			id: hipHazardTable.id,
			clusterId: hipClusterTable.id,
			typeId: hipTypeTable.id,
			code: hipHazardTable.code,
			name: sql<string>`${hipHazardTable.name}->>${ctx.lang}`,
			description: sql<string>`${hipHazardTable.description}->>${ctx.lang}`,
		})
		.from(hipHazardTable)
		.innerJoin(hipClusterTable, eq(hipClusterTable.id, hipHazardTable.clusterId))
		.innerJoin(hipTypeTable, eq(hipTypeTable.id, hipClusterTable.typeId))
		.where(eq(hipHazardTable.id, id));

	if (!rows.length){
		return null
	}

	return rows[0];
}

export async function getClusterById(
	ctx: BackendContext,
	id: string
) {
	const rows = await dr
		.select({
			id: hipClusterTable.id,
			typeId: hipClusterTable.typeId,
			name: sql<string>`${hipClusterTable.name}->>${ctx.lang}`,
		})
		.from(hipClusterTable)
		.innerJoin(hipTypeTable, eq(hipTypeTable.id, hipClusterTable.typeId))
		.where(eq(hipClusterTable.id, id));

	if (!rows.length){
		return null
	}

	return rows[0];
}

export async function getTypeById(
	ctx: BackendContext,
	id: string
) {
	const rows = await dr
		.select({
			id: hipTypeTable.id,
			name: sql<string>`${hipTypeTable.name}->>${ctx.lang}`,
		})
		.from(hipTypeTable)
		.where(eq(hipTypeTable.id, id));


	if (!rows.length){
		return null
	}

	return rows[0];
}

