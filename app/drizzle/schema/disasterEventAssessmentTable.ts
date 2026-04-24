import { relations, sql } from "drizzle-orm";
import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { assessmentTypeTable } from "./assessmentTypeTable";
import { disasterEventTable } from "./disasterEventTable";

export const disasterEventAssessmentTable = pgTable(
	"disaster_event_assessment",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		disasterEventId: uuid("disaster_event_id").references(
			() => disasterEventTable.id,
			{ onDelete: "cascade" },
		),
		assessmentTypeId: uuid("assessment_type_id").references(
			() => assessmentTypeTable.id,
			{ onDelete: "set null" },
		),
		assessmentDate: date("assessment_date"),
		description: text("description"),
	},
);

export type SelectDisasterEventAssessment =
	typeof disasterEventAssessmentTable.$inferSelect;
export type InsertDisasterEventAssessment =
	typeof disasterEventAssessmentTable.$inferInsert;

export const disasterEventAssessmentRel = relations(
	disasterEventAssessmentTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterEventAssessmentTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
		assessmentType: one(assessmentTypeTable, {
			fields: [disasterEventAssessmentTable.assessmentTypeId],
			references: [assessmentTypeTable.id],
		}),
	}),
);
