import {
	pgTable,
	uuid,
	AnyPgColumn,
	boolean,
	jsonb,
} from "drizzle-orm/pg-core";
import { ourRandomUUID, ourBigint } from "~/utils/drizzleUtil";
import { humanDsgConfigTable } from "./humanDsgConfigTable";
import { disasterRecordsTable } from "./disasterRecordsTable";

export const humanCategoryPresenceTable = pgTable("human_category_presence", {
	id: ourRandomUUID(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	deaths: boolean("deaths"),
	injured: boolean("injured"),
	missing: boolean("missing"),
	affectedDirect: boolean("affected_direct"),
	affectedIndirect: boolean("affected_indirect"),
	displaced: boolean("displaced"),

	deathsTotal: ourBigint("deaths_total"),
	injuredTotal: ourBigint("injured_total"),
	missingTotal: ourBigint("missing_total"),
	affectedDirectTotal: ourBigint("affected_direct_total"),
	affectedIndirectTotal: ourBigint("affected_indirect_total"),
	displacedTotal: ourBigint("displaced_total"),

	deathsTotalGroupColumnNames: jsonb("deaths_total_group_column_names"),
	injuredTotalGroupColumnNames: jsonb("injured_total_group_column_names"),
	missingTotalGroupColumnNames: jsonb("missing_total_group_column_names"),
	affectedTotalGroupColumnNames: jsonb("affected_total_group_column_names"),
	displacedTotalGroupColumnNames: jsonb("displaced_total_group_column_names"),
});

export type SelectHumanCategoryPresence =
	typeof humanDsgConfigTable.$inferSelect;
export type InsertHumanCategoryPresence =
	typeof humanDsgConfigTable.$inferInsert;
