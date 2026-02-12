import { relations } from "drizzle-orm";
import { pgTable, uuid, AnyPgColumn, text, unique } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categoriesTable";
import { disasterRecordsTable } from "./disasterRecordsTable";
import { apiImportIdField, ourRandomUUID, createdUpdatedTimestamps } from "~/utils/drizzleUtil";

// Table for Non-economic losses

export const nonecoLossesTable = pgTable(
	"noneco_losses",
	{
		...apiImportIdField(),
		id: ourRandomUUID(),
		disasterRecordId: uuid("disaster_record_id")
			.references((): AnyPgColumn => disasterRecordsTable.id)
			.notNull(),
		categoryId: uuid("category_id")
			.references((): AnyPgColumn => categoriesTable.id)
			.notNull(),
		description: text("description").notNull(),
		...createdUpdatedTimestamps,
	},
	(table) => {
		return [unique("nonecolosses_sectorIdx").on(table.disasterRecordId, table.categoryId)];
	},
);

export type SelectNonecoLosses = typeof nonecoLossesTable.$inferSelect;
export type InsertNonecoLosses = typeof nonecoLossesTable.$inferInsert;

export const nonecoLossesCategory_Rel = relations(nonecoLossesTable, ({ one }) => ({
	category: one(categoriesTable, {
		fields: [nonecoLossesTable.categoryId],
		references: [categoriesTable.id],
	}),
}));
