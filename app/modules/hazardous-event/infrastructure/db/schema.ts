import { relations, sql } from "drizzle-orm";
import { pgTable, uuid, AnyPgColumn, text, date } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";
import { countryAccountsTable } from "~/drizzle/schema/countryAccountsTable";
import { eventCausalityTable } from "~/drizzle/schema/eventCausalityTable";
import { hazardousEventAttachmentTable } from "~/drizzle/schema/hazardousEventAttachmentTable";
import { hazardousEventGeometryTable } from "~/drizzle/schema/hazardousEventGeometryTable";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { hipTypeTable } from "~/drizzle/schema/hipTypeTable";
import { userTable } from "~/drizzle/schema/userTable";

export const hazardousEventTable = pgTable("hazardous_event", {
	updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
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
	createdByUserId: uuid("created_by_user_id"),
	updatedByUserId: uuid("updated_by_user_id"),
	submittedByUserId: uuid("submitted_by_user_id"),
	submittedAt: timestamp("submitted_at"),
	validatedByUserId: uuid("validated_by_user_id"),
	validatedAt: timestamp("validated_at"),
	publishedByUserId: uuid("published_by_user_id"),
	publishedAt: timestamp("published_at"),
	hipHazardId: text("hip_hazard_id").references(
		(): AnyPgColumn => hipHazardTable.id,
	),
	hipClusterId: text("hip_cluster_id").references(
		(): AnyPgColumn => hipClusterTable.id,
	),
	hipTypeId: text("hip_type_id")
		.references((): AnyPgColumn => hipTypeTable.id)
		.notNull(),
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	countryAccountsId: uuid("country_accounts_id").references(
		() => countryAccountsTable.id,
	),
	nationalSpecification: text("national_specification"),
	startDate: date("start_date"),
	endDate: date("end_date"),
	description: text("description"),
	chainsExplanation: text("chains_explanation"),
	magnitude: text("magnitude"),
	recordOriginator: text("record_originator"),
	hazardousEventStatus: text("hazardous_event_status", {
		enum: ["forecasted", "ongoing", "passed"],
	}),
	dataSource: text("data_source"),
});

export type SelectHazardousEvent = typeof hazardousEventTable.$inferSelect;
export type InsertHazardousEvent = typeof hazardousEventTable.$inferInsert;

export const hazardousEventRel = relations(
	hazardousEventTable,
	({ one, many }) => ({
		countryAccount: one(countryAccountsTable, {
			fields: [hazardousEventTable.countryAccountsId],
			references: [countryAccountsTable.id],
		}),
		hipHazard: one(hipHazardTable, {
			fields: [hazardousEventTable.hipHazardId],
			references: [hipHazardTable.id],
		}),
		hipCluster: one(hipClusterTable, {
			fields: [hazardousEventTable.hipClusterId],
			references: [hipClusterTable.id],
		}),
		hipType: one(hipTypeTable, {
			fields: [hazardousEventTable.hipTypeId],
			references: [hipTypeTable.id],
		}),
		userSubmittedBy: one(userTable, {
			fields: [hazardousEventTable.submittedByUserId],
			references: [userTable.id],
		}),
		userValidatedBy: one(userTable, {
			fields: [hazardousEventTable.validatedByUserId],
			references: [userTable.id],
		}),
		userPublishedBy: one(userTable, {
			fields: [hazardousEventTable.publishedByUserId],
			references: [userTable.id],
		}),
		attachments: many(hazardousEventAttachmentTable),
		geometries: many(hazardousEventGeometryTable),
		causedHazards: many(eventCausalityTable, {
			relationName: "eventCausalityCauseHazardous",
		}),
		affectedByHazards: many(eventCausalityTable, {
			relationName: "eventCausalityEffectHazardous",
		}),
	}),
);
