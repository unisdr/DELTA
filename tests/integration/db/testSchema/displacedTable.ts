import { pgTable, uuid, AnyPgColumn, text, timestamp, integer } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "~/utils/drizzleUtil";
import { humanDsgTable } from "./humanDsgTable";

export const displacedTable = pgTable("displaced", {
	id: ourRandomUUID(),
	dsgId: uuid("dsg_id")
		.references((): AnyPgColumn => humanDsgTable.id)
		.notNull(),
	assisted: text("assisted", {
		enum: ["assisted", "not_assisted"],
	}),
	timing: text("timing", {
		enum: ["pre-emptive", "reactive"],
	}),
	duration: text("duration", {
		enum: [
			"short", // First 10 days
			"medium_short", // Days 10-30
			"medium_long", // Days 30-90
			"long", // More than 90 days
			"permanent", // Permanently relocated
		],
	}),
	asOf: timestamp("as_of"),
	displaced: integer("displaced"),
});
export type SelectDisplaced = typeof displacedTable.$inferSelect;
export type InsertDisplaced = typeof displacedTable.$inferInsert;
