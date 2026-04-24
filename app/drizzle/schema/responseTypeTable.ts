import { sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const responseTypeTable = pgTable("response_type", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	type: text("type").notNull(),
});

export type SelectResponseType = typeof responseTypeTable.$inferSelect;
export type InsertResponseType = typeof responseTypeTable.$inferInsert;
