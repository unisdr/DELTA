import { relations, sql } from "drizzle-orm";
import {
	pgTable,
	uuid,
	AnyPgColumn,
	text,
	jsonb,
	unique,
} from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";
import { eventTable } from "~/drizzle/schema/eventTable";
import { countryAccountsTable } from "~/drizzle/schema/countryAccountsTable";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { hipTypeTable } from "~/drizzle/schema/hipTypeTable";
import { userTable } from "~/drizzle/schema/userTable";

export const hazardousEventTable = pgTable(
	"hazardous_event",
	{
		updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
		createdAt: timestamp("created_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		approvalStatus: text({
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
		apiImportId: text("api_import_id"),
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
			.references((): AnyPgColumn => eventTable.id)
			.primaryKey(),
		countryAccountsId: uuid("country_accounts_id").references(
			() => countryAccountsTable.id,
		),
		status: text("status").notNull().default("pending"), //this column to be removed
		nationalSpecification: text("national_specification").notNull().default(""),
		startDate: text("start_date").notNull().default(""),
		endDate: text("end_date").notNull().default(""),
		description: text("description").notNull().default(""),
		chainsExplanation: text("chains_explanation").notNull().default(""),
		magnitude: text("magniture").notNull().default(""),
		spatialFootprint: jsonb("spatial_footprint"),
		attachments: jsonb("attachments"),
		recordOriginator: text("record_originator").notNull().default(""),
		hazardousEventStatus: text("hazardous_event_status", {
			enum: ["forecasted", "ongoing", "passed"],
		}),
		dataSource: text("data_source").notNull().default(""),
	},
	(table) => ({
		// Composite unique constraint for tenant-scoped api_import_id
		hazardousEventApiImportIdTenantUnique: unique(
			"hazardous_event_api_import_id_tenant_unique",
		).on(table.apiImportId, table.countryAccountsId),
	}),
);

export const hazardousEventTableConstraits = {
	apiImportId: "hazardous_event_apiImportId_unique",
	hipHazardId: "hazardous_event_hip_hazard_id_hip_hazard_id_fk",
	hipClusterId: "hazardous_event_hip_cluster_id_hip_cluster_id_fk",
	hipTypeId: "hazardous_event_hip_type_id_hip_type_id_fk",
};

export type SelectHazardousEvent = typeof hazardousEventTable.$inferSelect;
export type InsertHazardousEvent = typeof hazardousEventTable.$inferInsert;

export const hazardousEventRel = relations(hazardousEventTable, ({ one }) => ({
	event: one(eventTable, {
		fields: [hazardousEventTable.id],
		references: [eventTable.id],
	}),
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
}));
