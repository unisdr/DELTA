import { hazardousEventLabel } from "~/frontend/events/hazardeventform";
import { sql, and, eq } from "drizzle-orm";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { formatDateDisplay } from "~/utils/date";



const ctx: any = { t: (msg: any) => msg.msg };

export function contentPickerConfig() {
	return {
		id: "disasterEventId",
		required: false,
		viewMode: "grid",
		dataSources: "/analytics/content-picker-datasource",
		caption: "Disaster event",
		defaultText:
			"Select disaster event" + "...",
		table_column_primary_key: "id",
		table_columns: [
			{
				column_type: "db",
				column_field: "display",
				column_title: "Event",
				is_primary_id: true,
				is_selected_field: true,
				render: (_item: any, displayName: string) => {
					return `${displayName}`;
				},
			},
			{
				column_type: "db",
				column_field: "hazardousEventName",
				column_title: "Hazardous event",
				render: (item: any) => {
					if (!item.hazardousEventId) {
						return "Not linked to a hazardous event";
					}
					return hazardousEventLabel({
						id: item.hazardousEventId || "",
						description: "",
						hazard: { name: item.hazardousEventName || "" },
					});
				},
			},
			{
				column_type: "db",
				column_field: "startDateUTC",
				column_title: "Start date",
				render: (item: any) =>
					formatDateDisplay(item.startDateUTC, "d MMM yyyy"),
			},
			{
				column_type: "db",
				column_field: "endDateUTC",
				column_title: "End date",
				render: (item: any) => formatDateDisplay(item.endDateUTC, "d MMM yyyy"),
			},
			{
				column_type: "custom",
				column_field: "action",
				column_title: "Action",
			},
		],
		dataSourceDrizzle: {
			table: disasterEventTable,
			overrideSelect: {
				id: disasterEventTable.id,
				startDateUTC: disasterEventTable.startDate,
				endDateUTC: disasterEventTable.endDate,
				hazardousEventId: hazardousEventTable.id,
				hazardousEventName:
					sql<string>`dts_jsonb_localized(${hipHazardTable.name}, ${ctx.lang})`.as(
						"name",
					),
			},
			joins: [
				{
					type: "left",
					table: hazardousEventTable,
					condition: eq(
						disasterEventTable.hazardousEventId,
						hazardousEventTable.id,
					),
				},
				{
					type: "left",
					table: hipHazardTable,
					condition: eq(hazardousEventTable.hipHazardId, hipHazardTable.id),
				},
			],
			where: [
				// Define search filters
				eq(disasterEventTable.approvalStatus, "published"),
			],
			whereIlike: [
				{
					column: disasterEventTable.otherId1,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.glide,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.nameGlobalOrRegional,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.nameNational,
					placeholder: "[safeSearchPattern]",
				},
				{
					sql: (query: string) =>
						sql`dts_jsonb_localized(${hipHazardTable.name}, ${ctx.lang}) ILIKE ${query}`,
				},
				{
					column: disasterEventTable.startDate,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.endDate,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.approvalStatus,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.disasterDeclarationTypeAndEffect1,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.disasterDeclarationTypeAndEffect2,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.disasterDeclarationTypeAndEffect3,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.disasterDeclarationTypeAndEffect4,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.disasterDeclarationTypeAndEffect5,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.officialWarningAffectedAreas,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.earlyActionDescription1,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.earlyActionDescription2,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.earlyActionDescription3,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.earlyActionDescription4,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.earlyActionDescription5,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.responseOperations,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.dataSource,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.recordingInstitution,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.nonEconomicLosses,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.responseOperationsDescription,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.humanitarianNeedsDescription,
					placeholder: "[safeSearchPattern]",
				},
				{
					column: disasterEventTable.humanitarianNeedsDescription,
					placeholder: "[safeSearchPattern]",
				},

				{
					column: disasterEventTable.hazardousEventId,
					placeholder: "[safeSearchPattern]",
				},
				{ column: disasterEventTable.id, placeholder: "[safeSearchPattern]" },
			],
			orderBy: [{ column: disasterEventTable.startDate, direction: "desc" }], // Sorting
		},
		selectedDisplay: async (
			dr: any,
			id: any,
			countryAccountsId?: string,
		) => {
			const whereConditions = [eq(disasterEventTable.id, id)];

			// ADD TENANT FILTERING
			if (countryAccountsId) {
				whereConditions.push(
					eq(disasterEventTable.countryAccountsId, countryAccountsId),
				);
			}
			const row = await dr
				.select()
				.from(disasterEventTable)
				.where(
					whereConditions.length > 1
						? and(...whereConditions)
						: whereConditions[0],
				) // USE PROPER AND CONDITION
				.limit(1)
				.execute();

			if (!row.length)
				return "No event found";

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
