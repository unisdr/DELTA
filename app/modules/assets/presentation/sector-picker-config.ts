import { sql } from "drizzle-orm";
import { sectorTable } from "~/drizzle/schema/sectorTable";

export function contentPickerConfigSector() {
	return {
		id: "sectorIds",
		viewMode: "tree",
		multiSelect: true,
		dataSources: "/settings/assets/content-picker-datasource",
		caption: "Sectors",
		defaultText: "Select sector...",
		table_column_primary_key: "id",
		table_columns: [
			{
				column_type: "db",
				column_field: "id",
				column_title: "ID",
				is_primary_id: true,
				is_selected_field: true,
			},
			{
				column_type: "db",
				column_field: "parentId",
				column_title: "Parent ID",
				tree_field: "parentKey",
			},
			{
				column_type: "db",
				column_field: "sectorname",
				column_title: "Name",
				tree_field: "nameKey",
			},
			{
				column_type: "custom",
				column_field: "action",
				column_title: "Action",
			},
		],
		dataSourceDrizzle: {
			table: sectorTable,
			overrideSelect: {
				id: sectorTable.id,
				parentId: sectorTable.parentId,
				name: sql<string>`dts_jsonb_localized(${sectorTable.name}, ${"en"})`.as(
					"name",
				),
			},
			orderBy: [{ column: sectorTable.id, direction: "asc" as const }],
		},
		selectedDisplay: async (dr: any, ids: string) => {
			if (!ids) return [];
			const sectorIds = ids.split(",").filter(Boolean);
			if (!sectorIds.length) return [];

			const { rows } = await dr.execute(sql`
				SELECT id, sectorname
				FROM sector
				WHERE id IN (${sql.join(sectorIds, sql`, `)})
			`);

			const idToNameMap = new Map(
				rows.map((row: any) => [row.id, row.sectorname]),
			);

			return sectorIds.map((id) => ({
				id,
				name: (idToNameMap.get(id) || "No sector found") as string,
			}));
		},
	};
}
