import { relations } from "drizzle-orm";
import { pgTable, uuid, AnyPgColumn, text, jsonb } from "drizzle-orm/pg-core";
import { apiImportIdField, ourRandomUUID, ourBigint, ourMoney } from "../../utils/drizzleUtil";
import { sectorTable } from "./sectorTable";
import { disasterRecordsTable } from "./disasterRecordsTable";

export const disruptionTable = pgTable("disruption", {
	...apiImportIdField(),
	id: ourRandomUUID(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sectorId: uuid("sector_id")
		.references((): AnyPgColumn => sectorTable.id)
		.notNull(),
	durationDays: ourBigint("duration_days"),
	durationHours: ourBigint("duration_hours"),
	usersAffected: ourBigint("users_affected"),
	peopleAffected: ourBigint("people_affected"),
	comment: text("comment"),
	responseOperation: text("response_operation"),
	responseCost: ourMoney("response_cost"),
	responseCurrency: text("response_currency"),
	spatialFootprint: jsonb("spatial_footprint"),
	attachments: jsonb("attachments"),
});

export const disruptionRel = relations(disruptionTable, ({ one }) => ({
	sector: one(sectorTable, {
		fields: [disruptionTable.sectorId],
		references: [sectorTable.id],
	}),
}));

export type SelectDisruption = typeof disruptionTable.$inferSelect;
export type InsertDisruption = typeof disruptionTable.$inferInsert;
