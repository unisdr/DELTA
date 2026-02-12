import { pgTable, uuid, text, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "~/utils/drizzleUtil";
import { userTable } from "./userTable";

export const entityValidationAssignmentTable = pgTable(
	"entity_validation_assignment",
	{
		id: ourRandomUUID(),
		entityId: uuid("entity_id"),
		entityType: text("entity_type").notNull(),
		assignedToUserId: uuid("assigned_to_user_id").notNull(),
		assignedByUserId: uuid("assigned_by_user_id").notNull(),
		assignedAt: timestamp("assigned_at", { mode: "string" }).defaultNow().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.assignedToUserId],
			foreignColumns: [userTable.id],
			name: "fk_entity_validation_assignment_user_assigned_to_user_id",
		}),
		foreignKey({
			columns: [table.assignedByUserId],
			foreignColumns: [userTable.id],
			name: "fk_entity_validation_assignment_user_assigned_by_user_id",
		}),
	],
);

export type SelectEntityValidationAssignment = typeof entityValidationAssignmentTable.$inferSelect;
export type InsertEntityValidationAssignment = typeof entityValidationAssignmentTable.$inferInsert;
