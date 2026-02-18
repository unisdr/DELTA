import { relations } from "drizzle-orm";
import { pgTable, uuid, AnyPgColumn, text, jsonb } from "drizzle-orm/pg-core";
import {
	apiImportIdField,
	ourRandomUUID,
	unitsEnum,
	ourBigint,
	zeroBool,
	ourMoney,
} from "../../utils/drizzleUtil";
import { sectorTable } from "./sectorTable";
import { disasterRecordsTable } from "./disasterRecordsTable";
import { assetTable } from "./assetTable";

export const damagesTable = pgTable("damages", {
	...apiImportIdField(),
	id: ourRandomUUID(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sectorId: uuid("sector_id")
		.references((): AnyPgColumn => sectorTable.id)
		.notNull(),
	assetId: uuid("asset_id")
		.references((): AnyPgColumn => assetTable.id)
		.notNull(),

	unit: unitsEnum("unit"),

	totalDamageAmount: ourBigint("total_damage_amount"),
	totalDamageAmountOverride: zeroBool("total_damage_amount_override"),
	totalRepairReplacement: ourMoney("total_repair_replacement"),
	totalRepairReplacementOverride: zeroBool("total_repair_replacement_override"),
	totalRecovery: ourMoney("total_recovery"),
	totalRecoveryOverride: zeroBool("total_recovery_override"),

	// Partially damaged
	pdDamageAmount: ourBigint("pd_damage_amount"),
	pdRepairCostUnit: ourMoney("pd_repair_cost_unit"),
	pdRepairCostUnitCurrency: text("pd_repair_cost_unit_currency"),
	pdRepairCostTotal: ourMoney("pd_repair_cost_total"),
	pdRepairCostTotalOverride: zeroBool("pd_repair_cost_total_override"),
	pdRecoveryCostUnit: ourMoney("pd_recovery_cost_unit"),
	pdRecoveryCostUnitCurrency: text("pd_recovery_cost_unit_currency"),
	pdRecoveryCostTotal: ourMoney("pd_recovery_cost_total"),
	pdRecoveryCostTotalOverride: zeroBool("pd_recovery_cost_total_override"),
	pdDisruptionDurationDays: ourBigint("pd_disruption_duration_days"),
	pdDisruptionDurationHours: ourBigint("pd_disruption_duration_hours"),
	pdDisruptionUsersAffected: ourBigint("pd_disruption_users_affected"),
	pdDisruptionPeopleAffected: ourBigint("pd_disruption_people_affected"),
	pdDisruptionDescription: text("pd_disruption_description"),

	// Totally destroyed
	tdDamageAmount: ourBigint("td_damage_amount"),
	tdReplacementCostUnit: ourMoney("td_replacement_cost_unit"),
	tdReplacementCostUnitCurrency: text("td_replacement_cost_unit_currency"),
	tdReplacementCostTotal: ourMoney("td_replacement_cost_total"),
	tdReplacementCostTotalOverride: zeroBool(
		"td_replacement_cost_total_override",
	),
	tdRecoveryCostUnit: ourMoney("td_recovery_cost_unit"),
	tdRecoveryCostUnitCurrency: text("td_recovery_cost_unit_currency"),
	tdRecoveryCostTotal: ourMoney("td_recovery_cost_total"),
	tdRecoveryCostTotalOverride: zeroBool("td_recovery_cost_total_override"),
	tdDisruptionDurationDays: ourBigint("td_disruption_duration_days"),
	tdDisruptionDurationHours: ourBigint("td_disruption_duration_hours"),
	tdDisruptionUsersAffected: ourBigint("td_disruption_users_affected"),
	tdDisruptionPeopleAffected: ourBigint("td_disruption_people_affected"),
	tdDisruptionDescription: text("td_disruption_description"),

	spatialFootprint: jsonb("spatial_footprint"),
	attachments: jsonb("attachments"),
});

export const damagesRel = relations(damagesTable, ({ one }) => ({
	asset: one(assetTable, {
		fields: [damagesTable.assetId],
		references: [assetTable.id],
	}),
	sector: one(sectorTable, {
		fields: [damagesTable.sectorId],
		references: [sectorTable.id],
	}),
}));

export type SelectDamages = typeof damagesTable.$inferSelect;
export type InsertDamages = typeof damagesTable.$inferInsert;
