import { relations } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdUpdatedTimestamps, ourRandomUUID, zeroText } from "~/utils/drizzleUtil";
import { countryAccounts } from "./countryAccounts";
import { userTable } from "./userTable";

export const apiKeyTable = pgTable("api_key", {
	...createdUpdatedTimestamps,
	id: ourRandomUUID(),
	secret: text("secret").notNull().unique(),
	name: zeroText("name"),
	managedByUserId: uuid("user_id")
		.notNull()
		.references(() => userTable.id, { onDelete: "cascade" }),
	countryAccountsId: uuid("country_accounts_id").references(() => countryAccounts.id, {
		onDelete: "cascade",
	}),
});

export type SelectApiKey = typeof apiKeyTable.$inferSelect;
export type InsertApiKey = typeof apiKeyTable.$inferInsert;
export type ApiKeyWithUser = SelectApiKey & {
	managedByUser: {
		id: string;
		email: string;
	};
};

export const apiKeyRelations = relations(apiKeyTable, ({ one }) => ({
	managedByUser: one(userTable, {
		fields: [apiKeyTable.managedByUserId],
		references: [userTable.id],
	}),
}));
