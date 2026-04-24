import { relations, sql } from "drizzle-orm";
import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { disasterEventTable } from "./disasterEventTable";

export const disasterEventAttachmentTable = pgTable(
	"disaster_event_attachment",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		disasterEventId: uuid("disaster_event_id").references(
			() => disasterEventTable.id,
			{ onDelete: "cascade" },
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

export type SelectDisasterEventAttachment =
	typeof disasterEventAttachmentTable.$inferSelect;
export type InsertDisasterEventAttachment =
	typeof disasterEventAttachmentTable.$inferInsert;

export const disasterEventAttachmentRel = relations(
	disasterEventAttachmentTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterEventAttachmentTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
	}),
);
