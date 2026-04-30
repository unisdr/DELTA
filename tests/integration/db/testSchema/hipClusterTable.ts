import { relations } from "drizzle-orm";
import { pgTable, text, AnyPgColumn } from "drizzle-orm/pg-core";
import { zeroStrMap } from "~/utils/drizzleUtil";
import { hipTypeTable } from "./hipTypeTable";

// examples:
// Flood
// Temperature-Related

export const hipClusterTable = pgTable("hip_cluster", {
	id: text("id").primaryKey(),
	typeId: text("type_id")
		.references((): AnyPgColumn => hipTypeTable.id)
		.notNull(),
	name: zeroStrMap("name"),
});

export const hipClusterRel = relations(hipClusterTable, ({ one }) => ({
	class: one(hipTypeTable, {
		fields: [hipClusterTable.typeId],
		references: [hipTypeTable.id],
	}),
}));
