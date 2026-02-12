import { relations } from "drizzle-orm";
import { pgTable, uuid, AnyPgColumn } from "drizzle-orm/pg-core";
import {
	ourRandomUUID,
	zeroStrMap,
	ourBigint,
	createdUpdatedTimestamps,
} from "../../utils/drizzleUtil";
import { sectorDisasterRecordsRelationTable } from "./sectorDisasterRecordsRelationTable";

/**
 * This sector table is configured to support hierarchical relationships and sector-specific details.
 * Changes may occur based on further project requirements.
 */
// examples:
// id: 39,
// parent_id: 19,
// sectorname": Agriculture,
// subsector: Crops
// description: The cultivation and harvesting of plants for food, fiber, and other products.

export const sectorTable = pgTable("sector", {
	id: ourRandomUUID(),
	parentId: uuid("parent_id").references((): AnyPgColumn => sectorTable.id),
	name: zeroStrMap("name"),
	description: zeroStrMap("description"), // Optional description for the sector | Additional details about the sector
	level: ourBigint("level").notNull().default(1), // value is parent level + 1 otherwise 1
	...createdUpdatedTimestamps,
});

export const sectoryParent_Rel = relations(sectorTable, ({ one }) => ({
	sectorParent: one(sectorTable, {
		fields: [sectorTable.parentId],
		references: [sectorTable.id],
	}),
})); // Types for TypeScript

export type SelectSector = typeof sectorTable.$inferSelect;
export type InsertSector = typeof sectorTable.$inferInsert; /** Relationships for `sectorTable` */

export const sectorRel = relations(sectorTable, ({ one, many }) => ({
	// A self-referencing relationship for hierarchical sectors
	parentSector: one(sectorTable, {
		fields: [sectorTable.parentId],
		references: [sectorTable.id],
	}),

	// Linking `sector` to `sector_disaster_records_relation`
	relatedDisasterRecords: many(sectorDisasterRecordsRelationTable, {
		relationName: "sector_disaster_records_relation",
	}),
}));
