import { pgTable, uuid, AnyPgColumn, integer } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "~/utils/drizzleUtil";
import { humanDsgTable } from "./humanDsgTable";

export const deathsTable = pgTable("deaths", {
	id: ourRandomUUID(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	deaths: integer("deaths"),
});

export type SelectDeaths = typeof deathsTable.$inferSelect;
export type InsertDeaths = typeof deathsTable.$inferInsert;
