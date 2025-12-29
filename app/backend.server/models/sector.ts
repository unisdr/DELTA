import { asc, and, eq, sql, isNull, aliasedTable } from 'drizzle-orm';

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
): Promise<{ id: string; sectorname: string; parent_id: string | null }[]> {
	const select = {
		id: sectorTable.id,
		sectorname: sectorTable.sectorname,
		parent_id: sectorTable.parentId,
	};

	const rows = sectorParent_id
		? await dr
			.select(select)
			.from(sectorTable)
			.where(eq(sectorTable.parentId, sectorParent_id))
			.orderBy(asc(sectorTable.sectorname))
			.execute()
		: await dr
			.select(select)
			.from(sectorTable)
			.where(isNull(sectorTable.parentId))
			.orderBy(asc(sectorTable.sectorname))
			.execute();

	return rows.map((row) => ({
		...row,
		sectorname: ctx.dbt({
			type: "sector.name",
			id: String(row.id),
			msg: row.sectorname,
		}),
	}));
}

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
}

export async function allSectors(tx: Tx) {
	let res = await tx.query.sectorTable.findMany()
	return res
}

export async function getSectorsByLevel(level: number): Promise<{ id: number | never, name: string | unknown }[]> {
	const sectorParentTable = aliasedTable(sectorTable, "sectorParentTable");

	// TODO: TRANSLATE: the logic here to get name seems wrong, I think the sector name is required in general, we need id for translation
	return await dr.select({
		id: sectorTable.id,
		name: sql`(
				CASE WHEN ${sectorParentTable.sectorname} IS NULL THEN ${sectorTable.sectorname} 
				ELSE  ${sectorTable.sectorname} || ' (' || ${sectorParentTable.sectorname} || ')'
				END
			)`.as('name'),
	}).from(sectorTable)
		.leftJoin(sectorParentTable, eq(sectorParentTable.id, sectorTable.parentId))
		.where(eq(sectorTable.level, level))
		.orderBy(sectorTable.sectorname)
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
	if (includeParentObject) {
		const res = await dr.query.sectorTable.findFirst({
			where: eq(sectorTable.id, id),
			with: {
				sectorParent: true
			}
		});
		if (res) {
			res.sectorname = ctx.dbt({
				type: "sector.name",
				id: String(res.id),
				msg: res.sectorname,
			});
		}
		return res;
	}
	else {
		const res = await dr.query.sectorTable.findFirst({
			where: eq(sectorTable.id, id),
		});
		if (res) {
			res.sectorname = ctx.dbt({
				type: "sector.name",
				id: String(res.id),
				msg: res.sectorname,
			});
		}
		return res;
	}
}

export async function sectorChildrenById(ctx: BackendContext, parentId: string) {
	const res = await dr.selectDistinctOn(
		[sectorTable.sectorname],
		{
			sectorname: sectorTable.sectorname,
			id: sectorTable.id,
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
		.orderBy(
			asc(sectorTable.sectorname)
		)
		.execute();

	for (const row of res) {
		row.sectorname = ctx.dbt({
			type: "sector.name",
			id: String(row.id),
			msg: row.sectorname,
		});
	}

	return res;
}

export async function getSectorFullPathById(sectorId: string) {
	// TODO: TRANSLATE

	const { rows } = await dr.execute(sql`
		WITH RECURSIVE ParentCTE AS (
			SELECT id, sectorname, parent_id, sectorname AS full_path
			FROM sector
			WHERE id = ${sectorId}
			UNION ALL
			SELECT t.id, t.sectorname, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
			FROM sector t
			INNER JOIN ParentCTE p ON t.id = p.parent_id
		)
		SELECT full_path FROM ParentCTE WHERE parent_id IS NULL
	`);
	return rows[0]?.full_path || "No sector found";
}

export async function getSectorAncestorById(sectorId: number, sectorLevel: number = 2) {
	// TODO: TRANSLATE
	
	const { rows } = await dr.execute(sql`
		WITH RECURSIVE ParentCTE AS (
			SELECT id, sectorname, parent_id, level
			FROM sector
			WHERE id = ${sectorId}
			UNION ALL
			SELECT t.id, t.sectorname, t.parent_id, t.level
			FROM sector t
			INNER JOIN ParentCTE p ON t.id = p.parent_id
		)
		SELECT id, sectorname, level FROM ParentCTE WHERE level = ${sectorLevel}
	`);
	return rows[0] || null;
}
