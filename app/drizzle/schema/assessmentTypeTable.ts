import { sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const assessmentTypeTable = pgTable("assessment_type", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	type: text("type").notNull(),
});

export type SelectAssessmentType = typeof assessmentTypeTable.$inferSelect;
export type InsertAssessmentType = typeof assessmentTypeTable.$inferInsert;
