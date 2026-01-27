import { and, eq, sql, isNull, aliasedTable } from 'drizzle-orm';

import {
	sectorTable
} from '~/drizzle/schema';


import { dr, Tx } from '~/db.server';
import { BackendContext } from '../context';

export type SectorType = {
	id?: string;
	sectorname: string;
	parentId?: string;
	description?: string;
	updatedAt?: Date;
	createdAt?: Date;
	level?: number;
};

export async function getSectors(
	ctx: BackendContext,
	sectorParent_id: string | null
): Promise<{ id: string; name: string; parent_id: string | null }[]> {

	const select = {
		id: sectorTable.id,
		name: sql<string>`${sectorTable.name}->>${ctx.lang}`.as("name"),
		parent_id: sectorTable.parentId,
	};

	const rows = sectorParent_id
		? await dr
			.select(select)
			.from(sectorTable)
			.where(eq(sectorTable.parentId, sectorParent_id))
			.orderBy(sql`name`)
			.execute()
		: await dr
			.select(select)
			.from(sectorTable)
			.where(isNull(sectorTable.parentId))
			.orderBy(sql`name`)
			.execute();

	return rows;
}

/*

export async function upsertRecord(record: SectorType): Promise<void> {
	// Perform the upsert operation
	await dr
		.insert(sectorTable)
		.values(record)
		.onConflictDoUpdate({
			target: sectorTable.id,
			set: {
				id: record.id,
				sectorname: record.sectorname,
				description: record.description || null,
				parentId: record.parentId,
				level: record.level,
				updatedAt: sql`NOW()`,
			},
		});
}*/

export async function allSectors(tx: Tx) {
	let res = await tx.query.sectorTable.findMany()
	return res
}

export async function getSectorsByLevel(ctx: BackendContext, level: number): Promise<{ id: number | never, name: string | unknown }[]> {
	const sectorParentTable = aliasedTable(sectorTable, "sectorParentTable");

	return await dr.select({
		id: sectorTable.id,
		name: sql`(
				CASE WHEN ${sectorParentTable.id} IS NULL THEN ${sectorTable.name}->>${ctx.lang} 
				${sectorTable.name}->>${ctx.lang} || ' (' || ${sectorParentTable.name}->>${ctx.lang} || ')'
				END
			)`.as('name'),
	}).from(sectorTable)
		.leftJoin(sectorParentTable, eq(sectorParentTable.id, sectorTable.parentId))
		.where(eq(sectorTable.level, level))
		.orderBy(sql`name`)
		.execute();
}

let agricultureSectorId = "11";

export async function sectorIsAgriculture(tx: Tx, id: string, depth: number = 0): Promise<boolean> {
	let maxDepth = 100
	if (depth > maxDepth) {
		throw new Error("sector parent loop detected")
	}
	let row = await tx.query.sectorTable.findFirst({
		where: eq(sectorTable.id, id)
	})
	if (!row) {
		throw new Error("sector not found by id")
	}
	if (row.id == agricultureSectorId) {
		return true
	}
	if (row.parentId == null) {
		return false
	}
	return await sectorIsAgriculture(tx, row.parentId, depth + 1)
}

export async function sectorById(ctx: BackendContext, id: string, includeParentObject: boolean = false) {
	const res = await dr.query.sectorTable.findFirst({
		columns: {
			id: true,
		},
		extras: {
			name: sql<string>`${sectorTable.name}->>${ctx.lang}`.as("name"),
		},
		where: eq(sectorTable.id, id),
		with: {
			sectorParent: includeParentObject
		}
	});
	return res;
}

export async function sectorChildrenById(ctx: BackendContext, parentId: string) {
	const res = await dr.selectDistinctOn(
		[sectorTable.id],
		{
			id: sectorTable.id,
			name: sql<string>`${sectorTable.name}->>${ctx.lang}`.as('name'),
			relatedDecendants:
				sql`(
					dts_get_sector_decendants(${sectorTable.id})
				)`.as('relatedDecendants'),
		}).from(sectorTable)
		.where(
			and(
				eq(sectorTable.parentId, parentId),
			)
		)
		.orderBy(sectorTable.id)
		.execute();

	return res;
}

export async function getSectorFullPathById(ctx: BackendContext, sectorId: string) {
	const { rows } = await dr.execute(sql`
		WITH RECURSIVE ParentCTE AS (
			SELECT
				id,
				name->>${ctx.lang} as name,
				parent_id,
				ARRAY[id] AS path_ids,
				ARRAY[sectorname] AS path_names
			FROM sector
			WHERE id = ${sectorId}

			UNION ALL

			SELECT
				t.id,
				t.name->>${ctx.lang} as name,
				t.parent_id,
				p.path_ids || t.id,
				p.path_names || (t.name->>${ctx.lang})
			FROM sector t
			INNER JOIN ParentCTE p ON t.id = p.parent_id
		)
		SELECT path_ids, path_names
		FROM ParentCTE
		WHERE parent_id IS NULL;
`);

	if (rows.length === 0) return ctx.t({ "code": "sectors.no_sector_found", "msg": "No sector found" });

	//const path_ids = rows[0].path_ids as string[];
	const path_names = rows[0].path_names as string[];

	return path_names.join(" > ");
}


export async function getSectorAncestorById(
	ctx: BackendContext,
	sectorId: string,
	sectorLevel: number = 2
) {
	const { rows } = await dr.execute(sql`
    WITH RECURSIVE ParentCTE AS (
      SELECT
				id,
				name->>${ctx.lang} as name,
				parent_id,
				level
      FROM sector
      WHERE id = ${sectorId}

      UNION ALL

      SELECT
				t.id,
				t.name->>${ctx.lang} as name,
				t.parent_id,
				t.level
      FROM sector t
      INNER JOIN ParentCTE p ON t.id = p.parent_id
    )
    SELECT id, sectorname, level FROM ParentCTE WHERE level = ${sectorLevel}
  `);

	if (rows.length === 0) return null;

	const { id, name, level } = rows[0];

	return {
		id: String(id),
		name: name,
		level,
	};
}

