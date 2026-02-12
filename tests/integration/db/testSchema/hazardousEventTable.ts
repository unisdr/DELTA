import { relations } from "drizzle-orm";
import { pgTable, uuid, AnyPgColumn, text, jsonb, unique } from "drizzle-orm/pg-core";
import {
	createdUpdatedTimestamps,
	approvalFields,
	approvalWorkflowFields,
	apiImportIdField,
	hipRelationColumnsRequired,
	zeroText,
} from "~/utils/drizzleUtil";
import { eventTable } from "./eventTable";
import { countryAccounts } from "./countryAccounts";
import { hipHazardTable } from "./hipHazardTable";
import { hipClusterTable } from "./hipClusterTable";
import { hipTypeTable } from "./hipTypeTable";
import { userTable } from "./userTable";

export const hazardousEventTable = pgTable(
	"hazardous_event",
	{
		...createdUpdatedTimestamps,
		...approvalFields,
		...approvalWorkflowFields,
		...apiImportIdField(),
		...hipRelationColumnsRequired(),
		id: uuid("id")
			.references((): AnyPgColumn => eventTable.id)
			.primaryKey(),
		countryAccountsId: uuid("country_accounts_id").references(() => countryAccounts.id),
		status: text("status").notNull().default("pending"),
		nationalSpecification: zeroText("national_specification"),
		startDate: zeroText("start_date"),
		endDate: zeroText("end_date"),
		description: zeroText("description"),
		chainsExplanation: zeroText("chains_explanation"),
		magnitude: zeroText("magniture"),
		spatialFootprint: jsonb("spatial_footprint"),
		attachments: jsonb("attachments"),
		recordOriginator: zeroText("record_originator"),
		hazardousEventStatus: text("hazardous_event_status", {
			enum: ["forecasted", "ongoing", "passed"],
		}),
		dataSource: zeroText("data_source"),
	},
	(table) => ({
		// Composite unique constraint for tenant-scoped api_import_id
		hazardousEventApiImportIdTenantUnique: unique("hazardous_event_api_import_id_tenant_unique").on(
			table.apiImportId,
			table.countryAccountsId,
		),
	}),
);

export const hazardousEventTableConstraits = {
	apiImportId: "hazardous_event_apiImportId_unique",
	hipHazardId: "hazardous_event_hip_hazard_id_hip_hazard_id_fk",
};

export type SelectHazardousEvent = typeof hazardousEventTable.$inferSelect;
export type InsertHazardousEvent = typeof hazardousEventTable.$inferInsert;

export const hazardousEventRel = relations(hazardousEventTable, ({ one }) => ({
	event: one(eventTable, {
		fields: [hazardousEventTable.id],
		references: [eventTable.id],
	}),
	countryAccount: one(countryAccounts, {
		fields: [hazardousEventTable.countryAccountsId],
		references: [countryAccounts.id],
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
