import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { countryAccounts } from "./countryAccounts";
import {
	ourRandomUUID,
	zeroText,
	createdUpdatedTimestamps,
	apiImportIdField,
} from "../../utils/drizzleUtil";

export const organizationTable = pgTable(
	"organization",
	{
		id: ourRandomUUID(),
		name: zeroText("name"),
		...createdUpdatedTimestamps,
		...apiImportIdField(),
		countryAccountsId: uuid("country_accounts_id").references(() => countryAccounts.id, {
			onDelete: "cascade",
		}),
	},
	(table) => [
		unique("organization___api_import_id_country_accounts_id").on(
			table.name,
			table.apiImportId,
			table.countryAccountsId,
		),
	],
);

export type SelectOrganization = typeof organizationTable.$inferSelect;
export type InsertOrganization = typeof organizationTable.$inferInsert;
