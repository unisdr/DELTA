import { relations } from "drizzle-orm";
import {
	pgTable,
	uuid,
	varchar,
	boolean,
	timestamp,
} from "drizzle-orm/pg-core";
import { countryAccounts, SelectCountryAccounts } from "./countryAccounts";
import { ourRandomUUID } from "../../utils/drizzleUtil";
import { userTable, SelectUser } from "./userTable";
import { organizationTable } from "./organizationTable";

export const userCountryAccountsTable = pgTable("user_country_accounts", {
	id: ourRandomUUID(),
	userId: uuid("user_id")
		.notNull()
		.references(() => userTable.id, {
			onDelete: "cascade",
		}),
	countryAccountsId: uuid("country_accounts_id")
		.notNull()
		.references(() => countryAccounts.id, { onDelete: "cascade" }),
	role: varchar("role", { length: 100 }).notNull(),
	isPrimaryAdmin: boolean("is_primary_admin").notNull().default(false),
	addedAt: timestamp("added_at", {
		mode: "date",
		withTimezone: false,
	})
		.notNull()
		.defaultNow(),
	organizationId: uuid("organization_id").references(
		() => organizationTable.id,
	),
});

export type SelectUserCountryAccounts =
	typeof userCountryAccountsTable.$inferSelect;
export type InsertUserCountryAccounts =
	typeof userCountryAccountsTable.$inferInsert;
export type SelectUserCountryAccountsWithUser = SelectUserCountryAccounts & {
	user: SelectUser;
};

export type SelectUserCountryAccountsWithUserAndCountryAccounts =
	SelectUserCountryAccounts & {
		user: SelectUser;
		countryAccount: SelectCountryAccounts;
	};

export const userCountryAccountsRelations = relations(
	userCountryAccountsTable,
	({ one }) => ({
		countryAccount: one(countryAccounts, {
			fields: [userCountryAccountsTable.countryAccountsId],
			references: [countryAccounts.id],
		}),
		user: one(userTable, {
			fields: [userCountryAccountsTable.userId],
			references: [userTable.id],
		}),
		organization: one(organizationTable, {
			fields: [userCountryAccountsTable.organizationId],
			references: [organizationTable.id],
		}),
	}),
);
