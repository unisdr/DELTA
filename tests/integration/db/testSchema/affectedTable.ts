import { pgTable, uuid, AnyPgColumn, integer } from "drizzle-orm/pg-core";
import { humanDsgTable } from "./humanDsgTable";
import { ourRandomUUID } from "~/utils/drizzleUtil";

export const affectedTable = pgTable("affected", {
	id: ourRandomUUID(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	direct: integer("direct"),
	indirect: integer("indirect"),
});
export type SelectAffected = typeof affectedTable.$inferSelect;
export type InsertAffected = typeof affectedTable.$inferInsert;
