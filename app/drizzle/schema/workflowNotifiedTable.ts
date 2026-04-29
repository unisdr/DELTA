import { relations, sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { workflowInstanceTable } from "./workflowInstanceTable";
import { userTable } from "./userTable";

export const workflowNotifiedTable = pgTable("workflow_notified", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	workflowInstanceId: uuid("workflow_instance_id")
		.notNull()
		.references(() => workflowInstanceTable.id, { onDelete: "cascade" }),
	notifiedUserId: uuid("notified_user_id").references(() => userTable.id),
	notifiedByUserId: uuid("notified_by_user_id").references(() => userTable.id),
	notifiedAt: timestamp("notified_at")
		.notNull()
		.default(sql`now()`),
	notificationMessage: text("notification_message"),
});

export type SelectWorkflowNotified = typeof workflowNotifiedTable.$inferSelect;
export type InsertWorkflowNotified = typeof workflowNotifiedTable.$inferInsert;

export const workflowNotifiedRelations = relations(
	workflowNotifiedTable,
	({ one }) => ({
		workflowInstance: one(workflowInstanceTable, {
			fields: [workflowNotifiedTable.workflowInstanceId],
			references: [workflowInstanceTable.id],
		}),
		notifiedUser: one(userTable, {
			fields: [workflowNotifiedTable.notifiedUserId],
			references: [userTable.id],
		}),
		notifiedByUser: one(userTable, {
			fields: [workflowNotifiedTable.notifiedByUserId],
			references: [userTable.id],
		}),
	}),
);
