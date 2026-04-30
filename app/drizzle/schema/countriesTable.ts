import { relations } from "drizzle-orm";
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "../../utils/drizzleUtil";
import { countryAccountsTable } from "./countryAccountsTable";

////////////////////////////////////////////////////////////////
export const COUNTRY_TYPE = {
	REAL: "Real",
	FICTIONAL: "Fictional",
} as const;
export type CountryType = (typeof COUNTRY_TYPE)[keyof typeof COUNTRY_TYPE];

export const countriesTable = pgTable("countries", {
	id: ourRandomUUID(),
	name: varchar("name", { length: 100 }).notNull().unique(),
	iso3: varchar("iso3", { length: 3 }).unique(),
	flagUrl: varchar("flag_url", { length: 255 })
		.notNull()
		.default("https://example.com/default-flag.png"),
	type: varchar("type", { length: 20 }).notNull().default(COUNTRY_TYPE.REAL),
});

export type SelectCountries = typeof countriesTable.$inferSelect;
export type InsertCountries = typeof countriesTable.$inferInsert;

export const countriesRelations = relations(countriesTable, ({ many }) => ({
	countryAccounts: many(countryAccountsTable),
}));
