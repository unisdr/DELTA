import { relations, sql } from "drizzle-orm";
import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { hazardousEventTable } from "../../modules/hazardous-event/infrastructure/db/schema";

export const hazardousEventAttachmentTable = pgTable(
	"hazardous_event_attachment",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		hazardousEventId: uuid("hazardous_event_id").references(
			() => hazardousEventTable.id,
			{ onDelete: "set null" },
		),
		title: text("title").notNull().default(""),
		fileKey: text("file_key").notNull().default(""),
		fileName: text("file_name").notNull().default(""),
		fileType: text("file_type").notNull().default(""),
		fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
		createdAt: timestamp("created_at")
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at")
			.notNull()
			.default(sql`now()`),
	},
);

export type SelectHazardousEventAttachment =
	typeof hazardousEventAttachmentTable.$inferSelect;
export type InsertHazardousEventAttachment =
	typeof hazardousEventAttachmentTable.$inferInsert;

export const hazardousEventAttachmentRel = relations(
	hazardousEventAttachmentTable,
	({ one }) => ({
		hazardousEvent: one(hazardousEventTable, {
			fields: [hazardousEventAttachmentTable.hazardousEventId],
			references: [hazardousEventTable.id],
		}),
	}),
);
