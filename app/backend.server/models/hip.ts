import { dr } from '~/db.server';
import {
	hipTypeTable,
	hipClusterTable,
	hipHazardTable,
} from '~/drizzle/schema';
import { eq } from "drizzle-orm";
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
      nameEn: hipHazardTable.nameEn,
      descriptionEn: hipHazardTable.descriptionEn,
    })
    .from(hipHazardTable)
    .innerJoin(hipClusterTable, eq(hipClusterTable.id, hipHazardTable.clusterId))
    .innerJoin(hipTypeTable, eq(hipTypeTable.id, hipClusterTable.typeId))
    .where(eq(hipHazardTable.id, id));

  for (const row of rows) {
    row.nameEn = ctx.dbt({
      type: "hip_hazard.name",
      id: String(row.id),
      msg: row.nameEn,
    });

    if (row.descriptionEn) {
      row.descriptionEn = ctx.dbt({
        type: "hip_hazard.description",
        id: String(row.id),
        msg: row.descriptionEn,
      });
    }
  }

  return rows;
}

export async function getClusterById(
	ctx: BackendContext,
	id: string
) {
	const rows = await dr
		.select({
			id: hipClusterTable.id,
			typeId: hipClusterTable.typeId,
			nameEn: hipClusterTable.nameEn,
		})
		.from(hipClusterTable)
		.innerJoin(hipTypeTable, eq(hipTypeTable.id, hipClusterTable.typeId))
		.where(eq(hipClusterTable.id, id));

	for (const row of rows) {
		row.nameEn = ctx.dbt({
			type: "hip_cluster.name",
			id: String(row.id),
			msg: row.nameEn,
		});
	}

	return rows;
}

export async function getTypeById(
  ctx: BackendContext,
  id: string
) {
  const rows = await dr
    .select({
      id: hipTypeTable.id,
      nameEn: hipTypeTable.nameEn,
    })
    .from(hipTypeTable)
    .where(eq(hipTypeTable.id, id));

  for (const row of rows) {
    row.nameEn = ctx.dbt({
      type: "hip_type.name",
      id: String(row.id),
      msg: row.nameEn,
    });
  }

  return rows;
}

export async function upsertHip(item: Hip) {
	const [tp] = await dr
		.insert(hipTypeTable)
		.values({
			id: String(item.type_id),
			nameEn: item.type_name
		})
		.onConflictDoUpdate({
			target: hipTypeTable.id,
			set: { nameEn: item.type_name },
		})
		.returning({ id: hipTypeTable.id });

	const [cluster] = await dr
		.insert(hipClusterTable)
		.values({
			id: String(item.cluster_id),
			typeId: tp.id,
			nameEn: item.cluster_name
		})
		.onConflictDoUpdate({
			target: hipClusterTable.id,
			set: { typeId: tp.id, nameEn: item.cluster_name },
		})
		.returning({ id: hipClusterTable.id });

	await dr
		.insert(hipHazardTable)
		.values({
			id: String(item.id),
			code: item.notation,
			clusterId: String(cluster.id),
			nameEn: item.title,
			descriptionEn: item.description,
		})
		.onConflictDoUpdate({
			target: hipHazardTable.id,
			set: {
				code: item.notation,
				clusterId: String(cluster.id),
				nameEn: item.title,
				descriptionEn: item.description,
			},
		});
}
