import { sql } from "drizzle-orm";
import {
	pgTable,
	uuid,
	jsonb,
	boolean,
	timestamp,
	text,
} from "drizzle-orm/pg-core";
import { ourRandomUUID } from "~/utils/drizzleUtil";
import { countryAccountsTable } from "./countryAccountsTable";

export const noticesTable = pgTable("notices", {
	id: ourRandomUUID(),
	countryAccountsId: uuid("country_accounts_id")
		.notNull()
		.references(() => countryAccountsTable.id, { onDelete: "cascade" }),
	titleJson: jsonb("title_json"),
	bodyJson: jsonb("body_json"),
	isPublished: boolean("is_published").notNull().default(false),
	// audience exists from day one to avoid a breaking migration when public/hybrid support is added
	audience: text("audience", { enum: ["public", "private", "all"] })
		.notNull()
		.default("private"),
	publishedAt: timestamp("published_at", { withTimezone: true }),
	// createdAt/updatedAt declared inline (not via createdUpdatedTimestamps) to enforce TIMESTAMPTZ per ADR-002
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(
		sql`CURRENT_TIMESTAMP`,
	),
});

export type SelectNotice = typeof noticesTable.$inferSelect;
export type InsertNotice = typeof noticesTable.$inferInsert;
