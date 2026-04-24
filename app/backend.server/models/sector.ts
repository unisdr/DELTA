import { and, eq, sql, aliasedTable } from "drizzle-orm";
import { sectorTable } from "~/drizzle/schema/sectorTable";

import { dr, Tx } from "~/db.server";

export type SectorType = {
	id?: string;
	sectorname: string;
	parentId?: string;
	description?: string;
	updatedAt?: Date;
	createdAt?: Date;
	level?: number;
};

export async function getSectorsByLevel(
	level: number,
): Promise<{ id: number | never; name: string | unknown }[]> {
	const sectorParentTable = aliasedTable(sectorTable, "sectorParentTable");

	return await dr
		.select({
			id: sectorTable.id,
			name: sql`
        CASE
          WHEN ${sectorParentTable.id} IS NULL
          THEN dts_jsonb_localized(${sectorTable.name}, 'en')
          ELSE dts_jsonb_localized(${sectorTable.name}, 'en') || ' (' || dts_jsonb_localized(${sectorParentTable.name}, 'en') || ')'
        END
      `.as("name"),
		})
		.from(sectorTable)
		.leftJoin(sectorParentTable, eq(sectorParentTable.id, sectorTable.parentId))
		.where(eq(sectorTable.level, level))
		.orderBy(sql`name`)
		.execute();
}

let agricultureSectorId = "11";

export async function sectorIsAgriculture(
	tx: Tx,
	id: string,
	depth: number = 0,
): Promise<boolean> {
	let maxDepth = 100;
	if (depth > maxDepth) {
		throw new Error("sector parent loop detected");
	}
	let row = await tx.query.sectorTable.findFirst({
		where: eq(sectorTable.id, id),
	});
	if (!row) {
		return false;
	}
	if (row.id == agricultureSectorId) {
		return true;
	}
	if (row.parentId == null) {
		return false;
	}
	return await sectorIsAgriculture(tx, row.parentId, depth + 1);
}

export async function sectorById(
	id: string,
	includeParentObject: boolean = false,
) {
	const res = await dr.query.sectorTable.findFirst({
		columns: {
			id: true,
		},
		extras: {
			name: sql<string>`dts_jsonb_localized(${sectorTable.name}, 'en')`.as(
				"name",
			),
		},
		where: eq(sectorTable.id, id),
		with: {
			sectorParent: includeParentObject,
		},
	});
	return res;
}

export async function sectorChildrenById(parentId: string) {
	const res = await dr
		.selectDistinctOn([sectorTable.id], {
			id: sectorTable.id,
			name: sql<string>`dts_jsonb_localized(${sectorTable.name}, 'en')`.as(
				"name",
			),
			relatedDescendants: sql`(
					dts_get_sector_descendants('en', ${sectorTable.id})
				)`.as("relatedDescendants"),
		})
		.from(sectorTable)
		.where(and(eq(sectorTable.parentId, parentId)))
		.orderBy(sectorTable.id)
		.execute();

	return res;
}

export async function getSectorFullPathById(sectorId: string) {
	const { rows } = await dr.execute(sql`
		WITH RECURSIVE ParentCTE AS (
			SELECT
				id,
				dts_jsonb_localized(name, 'en') as name,
				parent_id,
				ARRAY[id] AS path_ids,
				ARRAY[sectorname] AS path_names
			FROM sector
			WHERE id = ${sectorId}

			UNION ALL

			SELECT
				t.id,
				dts_jsonb_localized(t.name, 'en') as name,
				t.parent_id,
				p.path_ids || t.id,
				p.path_names || (dts_jsonb_localized(t.name, 'en'))
			FROM sector t
			INNER JOIN ParentCTE p ON t.id = p.parent_id
		)
		SELECT path_ids, path_names
		FROM ParentCTE
		WHERE parent_id IS NULL;
`);

	if (rows.length === 0) return "No sector found";

	//const path_ids = rows[0].path_ids as string[];
	const path_names = rows[0].path_names as string[];

	return path_names.join(" > ");
}
