import { pgTable, varchar, uuid, integer, timestamp } from "drizzle-orm/pg-core";
import { countriesTable } from "./countriesTable";
import { ourRandomUUID } from "../../utils/drizzleUtil";
import { relations } from "drizzle-orm";
import { userCountryAccounts } from "./userCountryAccounts";

////////////////////////////////////////////////////////////////

export type CountryAccountType = "Official" | "Training";
export const countryAccountTypesTable = {
	OFFICIAL: "Official" as CountryAccountType,
	TRAINING: "Training" as CountryAccountType,
} as const;

export type CountryAccountStatus = 0 | 1;
export const countryAccountStatuses = {
	ACTIVE: 1 as CountryAccountStatus,
	INACTIVE: 0 as CountryAccountStatus,
} as const;

export const countryAccounts = pgTable("country_accounts", {
	id: ourRandomUUID(),
	shortDescription: varchar("short_description", { length: 20 }).notNull(),
	countryId: uuid("country_id")
		.notNull()
		.references(() => countriesTable.id),
	status: integer("status").notNull().default(countryAccountStatuses.ACTIVE),
	type: varchar("type", { length: 20 }).notNull().default(countryAccountTypesTable.OFFICIAL),
	createdAt: timestamp("created_at", { mode: "date", withTimezone: false }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "date", withTimezone: false }),
});

export type SelectCountryAccounts = typeof countryAccounts.$inferSelect;
export type InsertCountryAccounts = typeof countryAccounts.$inferInsert;
export const countryAccountsRelations = relations(countryAccounts, ({ one, many }) => ({
	country: one(countriesTable, {
		fields: [countryAccounts.countryId],
		references: [countriesTable.id],
	}),
	userCountryAccounts: many(userCountryAccounts),
}));
