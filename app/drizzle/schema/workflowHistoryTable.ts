import { relations, sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { workflowInstanceTable } from "./workflowInstanceTable";
import { userTable } from "./userTable";

export const workflowHistoryTable = pgTable("workflow_history", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	workflowInstanceId: uuid("workflow_instance_id")
		.notNull()
		.references(() => workflowInstanceTable.id, { onDelete: "cascade" }),
	fromStatus: text("from_status", {
		enum: [
			"draft",
			"submitted",
			"revision_requested",
			"approved",
			"rejected",
			"published",
		],
	}),
	toStatus: text("to_status", {
		enum: [
			"draft",
			"submitted",
			"revision_requested",
			"approved",
			"rejected",
			"published",
		],
	}).notNull(),
	actionBy: uuid("action_by").references(() => userTable.id),
	comment: text("comment"),
	createdAt: timestamp("created_at")
		.notNull()
		.default(sql`now()`),
});

export type SelectWorkflowHistory = typeof workflowHistoryTable.$inferSelect;
export type InsertWorkflowHistory = typeof workflowHistoryTable.$inferInsert;

export const workflowHistoryRelations = relations(
	workflowHistoryTable,
	({ one }) => ({
		workflowInstance: one(workflowInstanceTable, {
			fields: [workflowHistoryTable.workflowInstanceId],
			references: [workflowInstanceTable.id],
		}),
		actionByUser: one(userTable, {
			fields: [workflowHistoryTable.actionBy],
			references: [userTable.id],
		}),
	}),
);
