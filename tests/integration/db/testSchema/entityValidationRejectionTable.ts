import { pgTable, uuid, text, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "~/utils/drizzleUtil";
import { userTable } from "./userTable";

export const entityValidationRejectionTable = pgTable(
	"entity_validation_rejection",
	{
		id: ourRandomUUID(),
		entityId: uuid("entity_id"),
		entityType: text("entity_type").notNull(),
		rejectedByUserId: uuid("rejected_by_user_id").notNull(),
		rejectionMessage: text("rejection_message").notNull(),
		rejectedAt: timestamp("rejected_at", { mode: "string" }).defaultNow().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.rejectedByUserId],
			foreignColumns: [userTable.id],
			name: "fk_entity_validation_rejection_user_rejected_by_user_id",
		}),
	],
);

export type SelectEntityValidationRejection = typeof entityValidationRejectionTable.$inferSelect;
export type InsertEntityValidationRejection = typeof entityValidationRejectionTable.$inferInsert;
