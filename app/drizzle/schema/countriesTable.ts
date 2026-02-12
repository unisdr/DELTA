import { relations } from "drizzle-orm";
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "../../utils/drizzleUtil";
import { countryAccounts } from "./countryAccounts";

////////////////////////////////////////////////////////////////

export const countriesTable = pgTable("countries", {
	id: ourRandomUUID(),
	name: varchar("name", { length: 100 }).notNull().unique(),
	iso3: varchar("iso3", { length: 3 }).unique(),
	flagUrl: varchar("flag_url", { length: 255 })
		.notNull()
		.default("https://example.com/default-flag.png"),
});

export type SelectCountries = typeof countriesTable.$inferSelect;
export type InsertCountries = typeof countriesTable.$inferInsert;

export const countriesRelations = relations(countriesTable, ({ many }) => ({
	countryAccounts: many(countryAccounts),
}));
