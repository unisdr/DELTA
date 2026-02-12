import { pgTable, uuid, AnyPgColumn, integer } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "../../utils/drizzleUtil";
import { humanDsgTable } from "./humanDsgTable";

export const injuredTable = pgTable("injured", {
	id: ourRandomUUID(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	injured: integer("injured"),
});

export type SelectInjured = typeof injuredTable.$inferSelect;
export type InsertInjured = typeof injuredTable.$inferInsert;
