import { relations } from "drizzle-orm";
import {
	pgTable,
	uuid,
	AnyPgColumn,
	boolean,
	text,
	unique,
} from "drizzle-orm/pg-core";
import { disasterRecordsTable } from "./disasterRecordsTable";
import {
	apiImportIdField,
	ourRandomUUID,
	ourMoney,
} from "../../utils/drizzleUtil";
import { sectorTable } from "./sectorTable";

/** [SectorDisasterRecordsRelation] table links `sector` to `disaster_records` */

export const sectorDisasterRecordsRelationTable = pgTable(
	"sector_disaster_records_relation",
	{
		...apiImportIdField(),
		id: ourRandomUUID(),
		sectorId: uuid("sector_id")
			.notNull()
			.references((): AnyPgColumn => sectorTable.id),
		disasterRecordId: uuid("disaster_record_id")
			.notNull()
			.references((): AnyPgColumn => disasterRecordsTable.id),
		withDamage: boolean("with_damage"),
		damageCost: ourMoney("damage_cost"),
		damageCostCurrency: text("damage_cost_currency"),
		damageRecoveryCost: ourMoney("damage_recovery_cost"),
		damageRecoveryCostCurrency: text("damage_recovery_cost_currency"),
		withDisruption: boolean("with_disruption"),
		withLosses: boolean("with_losses"),
		lossesCost: ourMoney("losses_cost"),
		lossesCostCurrency: text("losses_cost_currency"),
	},
	(table) => [
		unique("sector_disaster_records_relation_sector_id_disaster_record_id").on(
			table.sectorId,
			table.disasterRecordId,
		),
	],
);
/** Relationships for `sectorDisasterRecordsRelationTable` */

export const sectorDisasterRecordsRel = relations(
	sectorDisasterRecordsRelationTable,
	({ one }) => ({
		// Linking each `sector_disaster_records_relation` to a sector
		sector: one(sectorTable, {
			fields: [sectorDisasterRecordsRelationTable.sectorId],
			references: [sectorTable.id],
		}),

		// Linking each `sector_disaster_records_relation` to a disaster record
		disasterRecord: one(disasterRecordsTable, {
			fields: [sectorDisasterRecordsRelationTable.disasterRecordId],
			references: [disasterRecordsTable.id],
		}),
	}),
);

export type SelectSectorDisasterRecordsRelation =
	typeof sectorDisasterRecordsRelationTable.$inferSelect;
export type InsertSectorDisasterRecordsRelation =
	typeof sectorDisasterRecordsRelationTable.$inferInsert;
