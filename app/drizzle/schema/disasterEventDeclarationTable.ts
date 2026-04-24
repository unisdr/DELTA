import { relations, sql } from "drizzle-orm";
import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { disasterEventTable } from "./disasterEventTable";

export const disasterEventDeclarationTable = pgTable(
	"disaster_event_declaration",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		disasterEventId: uuid("disaster_event_id").references(
			() => disasterEventTable.id,
			{ onDelete: "cascade" },
		),
		declarationDate: date("declaration_date"),
		description: text("description"),
	},
);

export type SelectDisasterEventDeclaration =
	typeof disasterEventDeclarationTable.$inferSelect;
export type InsertDisasterEventDeclaration =
	typeof disasterEventDeclarationTable.$inferInsert;

export const disasterEventDeclarationRel = relations(
	disasterEventDeclarationTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterEventDeclarationTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
	}),
);
