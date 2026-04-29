import { relations, sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { workflowHistoryTable } from "./workflowHistoryTable";
import { workflowNotifiedTable } from "./workflowNotifiedTable";

export const workflowInstanceTable = pgTable(
	"workflow_instance",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		entityId: uuid("entity_id").notNull(),
		entityType: text("entity_type", {
			enum: ["hazardous_event", "disaster_event"],
		})
			.notNull(),
		status: text("status", {
			enum: [
				"draft",
				"submitted",
				"revision_requested",
				"approved",
				"rejected",
				"published",
			],
		})
			.notNull()
			.default("draft"),
		createdAt: timestamp("created_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
		submittedAt: timestamp("submitted_at"),
		approvedAt: timestamp("approved_at"),
		publishedAt: timestamp("published_at"),
	},
	(table) => [
		{
			uniqueEntityTypeId: {
				columns: [table.entityType, table.entityId],
				unique: true,
			},
		},
	],
);

export type SelectWorkflowInstance = typeof workflowInstanceTable.$inferSelect;
export type InsertWorkflowInstance = typeof workflowInstanceTable.$inferInsert;

export const workflowInstanceRelations = relations(
	workflowInstanceTable,
	({ many }) => ({
		history: many(workflowHistoryTable),
		notified: many(workflowNotifiedTable),
	}),
);
