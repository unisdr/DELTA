import { relations } from "drizzle-orm";
import { pgTable, text, AnyPgColumn } from "drizzle-orm/pg-core";
import { zeroText, zeroStrMap } from "~/utils/drizzleUtil";
import { hipClusterTable } from "./hipClusterTable";
import { disasterRecordsTable } from "./disasterRecordsTable";

// examples:
// MH0004,Flood,Coastal Flood
// GH0001,Seismogenic (Earthquakes),Earthquake

export const hipHazardTable = pgTable("hip_hazard", {
	id: text("id").primaryKey(),
	code: zeroText("code"),
	clusterId: text("cluster_id")
		.references((): AnyPgColumn => hipClusterTable.id)
		.notNull(),
	name: zeroStrMap("name"),
	description: zeroStrMap("description"),
});

export const hipHazardRel = relations(hipHazardTable, ({ one }) => ({
	cluster: one(hipClusterTable, {
		fields: [hipHazardTable.clusterId],
		references: [hipClusterTable.id],
	}),
}));
/**
 * Pending final design confirmation from @sindicatoesp, this table's structure, especially its sector linkage,
 * may be revised to align with new requirements and ensure data integrity.
 */

export type SelectDisasterRecords = typeof disasterRecordsTable.$inferSelect;
export type InsertDisasterRecords = typeof disasterRecordsTable.$inferInsert;
