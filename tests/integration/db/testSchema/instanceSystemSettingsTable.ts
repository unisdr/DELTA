import { pgTable, boolean, varchar, uuid } from "drizzle-orm/pg-core";
import { url } from "~/utils/url";
import { ourRandomUUID } from "~/utils/drizzleUtil";
import { countryAccounts } from "./countryAccounts";

export const instanceSystemSettingsTable = pgTable("instance_system_settings", {
	id: ourRandomUUID(),
	footerUrlPrivacyPolicy: url("footer_url_privacy_policy"),
	footerUrlTermsConditions: url("footer_url_terms_conditions"),
	adminSetupComplete: boolean("admin_setup_complete").notNull().default(false),
	websiteLogo: varchar("website_logo").notNull().default("/assets/country-instance-logo.png"),
	websiteName: varchar("website_name", { length: 250 }).notNull().default("DELTA Resilience"),
	approvedRecordsArePublic: boolean().notNull().default(false),
	totpIssuer: varchar("totp_issuer", { length: 250 }).notNull().default("example-app"),
	dtsInstanceType: varchar("dts_instance_type").notNull().default("country"),
	dtsInstanceCtryIso3: varchar("dts_instance_ctry_iso3").notNull().default(""),
	currencyCode: varchar("currency_code").notNull().default("USD"),
	countryName: varchar("country_name").notNull().default("United State of America"), //this column has to be removed
	countryAccountsId: uuid("country_accounts_id").references(() => countryAccounts.id, {
		onDelete: "cascade",
	}),
	language: varchar("language").notNull().default("en"),
});

export type SelectInstanceSystemSettings = typeof instanceSystemSettingsTable.$inferSelect;
export type InsertInstanceSystemSettings = typeof instanceSystemSettingsTable.$inferInsert;
