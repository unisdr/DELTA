import { sql } from "drizzle-orm";
import { sectorTable } from "~/drizzle/schema";
import { DContext } from "~/util/dcontext";


export function contentPickerConfigSector(ctx: DContext) {
	return {
		id: "sectorIds",
		viewMode: "tree",
		multiSelect: true,
		dataSources: "/settings/assets/content-picker-datasource",
		caption: ctx.t({
			"code": "sectors",
			"msg": "Sectors"
		}),
		defaultText: ctx.t({
			"code": "sectors.select_sector",
			"msg": "Select sector"
		}) + "...",
		table_column_primary_key: "id",
		table_columns: [
			{
				column_type: "db",
				column_field: "id",
				column_title: ctx.t({
					"code": "common.id",
					"msg": "ID"
				}),
				is_primary_id: true,
				is_selected_field: true
			},
			{
				column_type: "db",
				column_field: "parentId",
				column_title: ctx.t({
					"code": "sectors.parent_id",
					"msg": "Parent Id"
				}),
				tree_field: "parentKey"
			},
			{
				column_type: "db",
				column_field: "sectorname",
				column_title: ctx.t({
					"code": "sectors.name",
					"msg": "Name"
				}),
				tree_field: "nameKey"
			},
			{
				column_type: "custom",
				column_field: "action",
				column_title: ctx.t({
					"code": "common.action",
					"msg": "Action"
				})
			}
		],
		dataSourceDrizzle: {
			table: sectorTable, // Store table reference
			selects: [ // Define selected columns
				{ alias: "id", column: sectorTable.id },
				{ alias: "parentId", column: sectorTable.parentId },
				{ alias: "sectorname", column: sectorTable.sectorname },
			],
			//orderBy: [{ column: sectorTable.sectorname, direction: "asc" }] // Sorting
			orderByOptions: {
				default: [{ column: sectorTable.sectorname, direction: "asc" }],
				custom: sql`CASE WHEN ${sectorTable.sectorname} = 'Cross-cutting' THEN 1 ELSE 0 END, ${sectorTable.sectorname} ASC`
			}
		},
		selectedDisplay: async (dr: any, ids: string) => {
			const sectorIds = ids.split(",").map((id) => id);

			if (sectorIds.length === 0) return [];

			const { rows } = await dr.execute(sql`
            SELECT id, sectorname 
            FROM sector
            WHERE id IN (${sql.join(sectorIds, sql`, `)})
        `);

			const idToNameMap = new Map(rows.map((row: any) => [row.id, row.sectorname]));

			// Return objects with { id, name }, preserving order of sectorIds
			return sectorIds.map(id => ({
				id,
				name: idToNameMap.get(id) || ctx.t({
					"code": "sectors.no_sector_found",
					"msg": "No sector found"
				})
			}));
		},
	};
}
