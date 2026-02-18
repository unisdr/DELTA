import { relations } from "drizzle-orm";
import {
	pgTable,
	uuid,
	AnyPgColumn,
	boolean,
	text,
	jsonb,
} from "drizzle-orm/pg-core";
import {
	apiImportIdField,
	ourRandomUUID,
	unitsEnum,
	ourBigint,
	ourMoney,
	zeroBool,
} from "~/utils/drizzleUtil";
import { sectorTable } from "./sectorTable";
import { disasterRecordsTable } from "./disasterRecordsTable";

/////////////////////////////////////////////////////

export const lossesTable = pgTable("losses", {
	...apiImportIdField(),
	id: ourRandomUUID(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sectorId: uuid("sector_id")
		.references((): AnyPgColumn => sectorTable.id)
		.notNull(),
	sectorIsAgriculture: boolean("sector_is_agriculture").notNull(),
	typeNotAgriculture: text("type_not_agriculture"),
	typeAgriculture: text("type_agriculture"),
	relatedToNotAgriculture: text("related_to_not_agriculture"),
	relatedToAgriculture: text("related_to_agriculture"),
	description: text("description"),
	publicUnit: unitsEnum("public_value_unit"),
	publicUnits: ourBigint("public_units"),
	publicCostUnit: ourMoney("public_cost_unit"),
	publicCostUnitCurrency: text("public_cost_unit_currency"),
	publicCostTotal: ourMoney("public_cost_total"),
	publicCostTotalOverride: zeroBool("public_cost_total_override"),
	privateUnit: unitsEnum("private_value_unit"),
	privateUnits: ourBigint("private_units"),
	privateCostUnit: ourMoney("private_cost_unit"),
	privateCostUnitCurrency: text("private_cost_unit_currency"),
	privateCostTotal: ourMoney("private_cost_total"),
	privateCostTotalOverride: zeroBool("private_cost_total_override"),
	spatialFootprint: jsonb("spatial_footprint"),
	attachments: jsonb("attachments"),
});

export const lossesRel = relations(lossesTable, ({ one }) => ({
	sector: one(sectorTable, {
		fields: [lossesTable.sectorId],
		references: [sectorTable.id],
	}),
}));

export type SelectLosses = typeof lossesTable.$inferSelect;
export type InsertLosses = typeof lossesTable.$inferInsert;
