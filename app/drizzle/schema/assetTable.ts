import { pgTable, text, boolean, uuid, unique } from "drizzle-orm/pg-core";
import {
	apiImportIdField,
	ourRandomUUID,
	zeroStrMap,
} from "../../utils/drizzleUtil";
import { countryAccountsTable } from "./countryAccountsTable";

///////////////////////////////////////////////

export const assetTable = pgTable(
	"asset",
	{
		...apiImportIdField(),
		id: ourRandomUUID(),
		sectorIds: text("sector_ids").notNull(),
		isBuiltIn: boolean("is_built_in").notNull(),

		builtInName: zeroStrMap("built_in_name"),
		customName: text("custom_name"),

		builtInCategory: zeroStrMap("built_in_category"),
		customCategory: text("custom_category"),

		nationalId: text("national_id"),

		builtInNotes: zeroStrMap("built_in_notes"),
		customNotes: text("custom_notes"),

		countryAccountsId: uuid("country_accounts_id").references(
			() => countryAccountsTable.id,
			{
				onDelete: "cascade",
			},
		),
	},
	(table) => ({
		// Composite unique constraint for tenant-scoped api_import_id
		assetApiImportIdTenantUnique: unique(
			"asset_api_import_id_tenant_unique",
		).on(table.apiImportId, table.countryAccountsId),
	}),
);

export const assetTableConstraints = {
	assetId: "damages_asset_id_asset_id_fk",
};

export type SelectAsset = typeof assetTable.$inferSelect;
export type InsertAsset = typeof assetTable.$inferInsert;
