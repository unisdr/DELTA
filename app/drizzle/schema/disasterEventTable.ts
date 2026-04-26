import { relations, sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, date } from "drizzle-orm/pg-core";
import { countryAccountsTable } from "./countryAccountsTable";
import { disasterEventAssessmentTable } from "./disasterEventAssessmentTable";
import { disasterEventAttachmentTable } from "./disasterEventAttachmentTable";
import { disasterEventDeclarationTable } from "./disasterEventDeclarationTable";
import { disasterEventGeographyTable } from "./disasterEventGeographyTable";
import { disasterEventResponseTable } from "./disasterEventResponseTable";
import { eventCausalityTable } from "./eventCausalityTable";
import { hipHazardTable } from "./hipHazardTable";
import { hipClusterTable } from "./hipClusterTable";
import { hipTypeTable } from "./hipTypeTable";

export const disasterEventTable = pgTable("disaster_event", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	countryAccountsId: uuid("country_accounts_id").references(
		() => countryAccountsTable.id,
		{ onDelete: "cascade" },
	),
	approvalStatus: text("approval_status", {
		enum: [
			"draft",
			"waiting-for-validation",
			"needs-revision",
			"validated",
			"published",
		],
	})
		.notNull()
		.default("draft"),
	hipHazardId: text("hip_hazard_id").references(() => hipHazardTable.id),
	hipClusterId: text("hip_cluster_id").references(() => hipClusterTable.id),
	hipTypeId: text("hip_type_id").references(() => hipTypeTable.id),
	nationalDisasterId: text("national_disaster_id").notNull().default(""),
	nameNational: text("name_national").notNull().default(""),
	glide: text("glide").notNull().default(""),
	nameGlobalOrRegional: text("name_global_or_regional").notNull().default(""),
	startDate: date("start_date"),
	endDate: date("end_date"),
	recordingInstitution: text("recording_institution").notNull().default(""),
	updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export type SelectDisasterEvent = typeof disasterEventTable.$inferSelect;
export type InsertDisasterEvent = typeof disasterEventTable.$inferInsert;

export const disasterEventRel = relations(
	disasterEventTable,
	({ one, many }) => ({
		countryAccount: one(countryAccountsTable, {
			fields: [disasterEventTable.countryAccountsId],
			references: [countryAccountsTable.id],
		}),
		hipHazard: one(hipHazardTable, {
			fields: [disasterEventTable.hipHazardId],
			references: [hipHazardTable.id],
		}),
		hipCluster: one(hipClusterTable, {
			fields: [disasterEventTable.hipClusterId],
			references: [hipClusterTable.id],
		}),
		hipType: one(hipTypeTable, {
			fields: [disasterEventTable.hipTypeId],
			references: [hipTypeTable.id],
		}),
		declarations: many(disasterEventDeclarationTable),
		responses: many(disasterEventResponseTable),
		assessments: many(disasterEventAssessmentTable),
		attachments: many(disasterEventAttachmentTable),
		geography: one(disasterEventGeographyTable, {
			fields: [disasterEventTable.id],
			references: [disasterEventGeographyTable.disasterEventId],
		}),
		causedDisasters: many(eventCausalityTable, {
			relationName: "eventCausalityCauseDisaster",
		}),
		causedByDisasters: many(eventCausalityTable, {
			relationName: "eventCausalityEffectDisaster",
		}),
		hazardousCausalities: many(eventCausalityTable, {
			relationName: "eventCausalityEffectDisaster",
		}),
	}),
);
