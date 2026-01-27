import { hazardousEventLabel } from "~/frontend/events/hazardeventform";
import { eq, sql, and } from "drizzle-orm";
import { disasterEventTable, hazardousEventTable, hipHazardTable, sectorTable, categoriesTable } from "~/drizzle/schema";
import { formatDateDisplay } from "~/util/date";
import { BackendContext } from "~/backend.server/context";
import { DContext } from "~/util/dcontext";

export function contentPickerConfig(ctx: DContext) {
	return {
		id: "disasterEventId",
		required: false,
		viewMode: "grid",
		dataSources: "/disaster-record/content-picker-datasource",
		caption: ctx.t({
			"code": "disaster_event.caption",
			"msg": "Disaster event"
		}),
		defaultText: ctx.t({
			"code": "disaster_event.select",
			"msg": "Select disaster event"
		}) + "...",
		table_column_primary_key: "id",
		table_columns: [
			{
				column_type: "db",
				column_field: "display",
				column_title: ctx.t({ "code": "common.event", "msg": "common.Event" }),
				is_primary_id: true,
				is_selected_field: true,
				render: (_item: any, displayName: string) => {
					return `${displayName}`;
				}
			},
			{
				column_type: "db",
				column_field: "hazardousEventName",
				column_title: ctx.t({ "code": "hazardous_event", "msg": "Hazardous event" }),
				render: (item: any) => {
					if (!item.hazardousEventId) {
						return ctx.t({
							"code": "hazardous_event.not_linked",
							"msg": "Not linked to a hazardous event"
						});
					}
					return hazardousEventLabel({
						id: item.hazardousEventId,
						description: "", // Assuming there's a description field
						hazard: { name: item.hazardousEventName || "" }
					})
				}
			},
			{
				column_type: "db",
				column_field: "startDateUTC",
				column_title: ctx.t({ "code": "common.start_date", "msg": "Start date" }),
				render: (item: any) => formatDateDisplay(item.startDateUTC, "d MMM yyyy")
			},
			{
				column_type: "db",
				column_field: "endDateUTC",
				column_title: ctx.t({ "code": "common.start_date", "msg": "End date" }),
				render: (item: any) => formatDateDisplay(item.endDateUTC, "d MMM yyyy")
			},
			{
				column_type: "custom",
				column_field: "action",
				column_title: ctx.t({ "code": "common.action", "msg": "Action" }),
			},
		],
		dataSourceDrizzle: {
			table: disasterEventTable, // Store table reference
			overrideSelect: {
				id: disasterEventTable.id,
				startDateUTC: disasterEventTable.startDate,
				endDateUTC: disasterEventTable.endDate,
				hazardousEventId: hazardousEventTable.id,
				hazardousEventName: sql<string>`${hipHazardTable.name}->>${ctx.lang}`.as('name'),
			},
			joins: [ // Define joins
				{ type: "left", table: hazardousEventTable, condition: eq(disasterEventTable.hazardousEventId, hazardousEventTable.id) },
				{ type: "left", table: hipHazardTable, condition: eq(hazardousEventTable.hipHazardId, hipHazardTable.id) }
			],
			whereIlike: [ // Define search filters
				{ column: disasterEventTable.otherId1, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.glide, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.nameGlobalOrRegional, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.nameNational, placeholder: "[safeSearchPattern]" },
				{ sql: (query: string) => sql`${hipHazardTable.name}->>${ctx.lang} ILIKE ${query}` },

				{ column: disasterEventTable.startDate, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.endDate, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.approvalStatus, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.disasterDeclarationTypeAndEffect1, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.disasterDeclarationTypeAndEffect2, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.disasterDeclarationTypeAndEffect3, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.disasterDeclarationTypeAndEffect4, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.disasterDeclarationTypeAndEffect5, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.officialWarningAffectedAreas, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.earlyActionDescription1, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.earlyActionDescription2, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.earlyActionDescription3, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.earlyActionDescription4, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.earlyActionDescription5, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.responseOperations, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.dataSource, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.recordingInstitution, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.nonEconomicLosses, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.responseOperationsDescription, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.humanitarianNeedsDescription, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.humanitarianNeedsDescription, placeholder: "[safeSearchPattern]" },

				{ column: disasterEventTable.hazardousEventId, placeholder: "[safeSearchPattern]" },
				{ column: disasterEventTable.id, placeholder: "[safeSearchPattern]" },
			],
			orderBy: [{ column: disasterEventTable.startDate, direction: "desc" }] // Sorting
		},
		selectedDisplay: async (ctx: BackendContext, dr: any, id: any, countryAccountsId?: string) => {
			// Build where conditions with tenant filtering
			const whereConditions = [eq(disasterEventTable.id, id)];

			// Add tenant filtering if tenant context is available
			if (countryAccountsId) {
				whereConditions.push(eq(disasterEventTable.countryAccountsId, countryAccountsId));
			}

			const row = await dr
				.select()
				.from(disasterEventTable)
				.where(and(...whereConditions))
				.limit(1)
				.execute();

			if (!row.length) return ctx.t({
				"code": "event.not_found",
				"msg": "No event found"
			});

			const event = row[0];
			let displayName = event.nameGlobalOrRegional || event.nameNational || "";
			let displayDate = "";

			if (event.startDate && event.endDate) {
				const startDate = new Date(event.startDate);
				const endDate = new Date(event.endDate);

				const startYear = startDate.getFullYear();
				const endYear = endDate.getFullYear();

				if (startYear !== endYear) {
					// Show full format including the year in start date
					displayDate = `${formatDateDisplay(startDate, "d MMM yyyy")} to ${formatDateDisplay(endDate, "d MMM yyyy")}`;
				} else if (startDate.getMonth() === endDate.getMonth()) {
					if (startDate.getDate() === endDate.getDate()) {
						displayDate = `${startDate.getDate()} ${formatDateDisplay(startDate, "MMM yyyy")}`;
					} else {
						displayDate = `${startDate.getDate()} to ${formatDateDisplay(endDate, "d MMM yyyy")}`;
					}
				} else {
					displayDate = `${formatDateDisplay(startDate, "d MMM")} to ${formatDateDisplay(endDate, "d MMM yyyy")}`;
				}
			}

			let displayId = event.id || "";
			// Truncate the display ID to 5 characters
			if (displayId.length > 5) {
				displayId = displayId.substring(0, 5);
			}

			return `${displayName} (${displayDate}) - ${displayId}`;
		},
	};
}

export function contentPickerConfigSector(ctx: DContext) {
	return {
		id: "sectorId",
		viewMode: "tree",
		dataSources: "/disaster-record/content-picker-datasource?view=1",
		caption: ctx.t({
			"code": "sectors.caption",
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
			/*
			{
				column_type: "db",
				column_field: "parentId",
				column_title: ctx.t({
					"code": "sectors.parent_id",
					"msg": "Parent ID"
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
		 */
		],
		dataSourceDrizzle: {
			table: sectorTable, // Store table reference
			overrideSelect: {
				id: sectorTable.id,
				parentId: sectorTable.parentId,
				name: sql<string>`${sectorTable.name}->>${ctx.lang}`.as('name'),
			},
		},
		selectedDisplay: async (dr: any, sectorId: any) => {
			if (!sectorId) return "No sector found";
			try {
				const { rows } = await dr.execute(sql`SELECT get_sector_full_path(${sectorId}) AS full_path`);
				return rows[0]?.full_path || "No sector found";
			} catch {
				const { rows } = await dr.execute(sql`
                WITH RECURSIVE ParentCTE AS (
                    SELECT
											id,
											name->>${ctx.lang} AS name,
											parent_id,
											name->>${ctx.lang} AS full_path
                    FROM sector
                    WHERE id = ${sectorId}
                    UNION ALL
                    SELECT
											t.id,
											t.name->>${ctx.lang} AS name,
											t.parent_id,
											t.name->>${ctx.lang} || ' > ' || p.full_path AS full_path
                    FROM sector t
                    INNER JOIN ParentCTE p ON t.id = p.parent_id
                )
                SELECT full_path FROM ParentCTE WHERE parent_id IS NULL
            `);
				return rows[0]?.full_path || "No sector found";
			}
		}
	};
}

export function contentPickerConfigCategory(ctx: DContext) {
	return {
		id: "categoryId",
		viewMode: "tree",
		dataSources: "/disaster-record/content-picker-datasource?view=2",
		caption: ctx.t({
			"code": "common.category",
			"msg": "Category"
		}),
		defaultText: ctx.t({
			"code": "common.select_category",
			"msg": "Select category"
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
					"code": "common.parent_id",
					"msg": "Parent ID"
				}),
				tree_field: "parentKey"
			},
			{
				column_type: "db",
				column_field: "name",
				column_title: ctx.t({
					"code": "common.name",
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
			table: categoriesTable, // Store table reference
			overrideSelect: {
				id: categoriesTable.id,
				parentId: categoriesTable.parentId,
				name: sql<string>`${categoriesTable.name}->>${ctx.lang}`.as('name'),
			},
			orderBy: [{
				column: sql<string>`name`,
				direction: "asc"
			}]
		},
		selectedDisplay: async (dr: any, categoryId: string) => {
			if (!categoryId) return "";

			try {
				const { rows } = await dr.execute(sql`SELECT get_category_full_path(${categoryId}) AS full_path`);
				return rows[0]?.full_path || "No category found";
			} catch {
				const { rows } = await dr.execute(sql`
                WITH RECURSIVE ParentCTE AS (
                    SELECT
											id,
											name->>${ctx.lang},
											parent_id,
											name->>${ctx.lang} AS full_path
                    FROM categories
                    WHERE id = ${categoryId}
                    UNION ALL
                    SELECT
											t.id,
											t.name->>${ctx.lang},
											t.parent_id,
											t.name->>${ctx.lang} || ' > ' || p.full_path AS full_path
                    FROM categories t
                    INNER JOIN ParentCTE p ON t.id = p.parent_id
                )
                SELECT full_path FROM ParentCTE WHERE parent_id IS NULL
            `);
				return rows[0]?.full_path || "No category found";
			}
		}
	}
}
