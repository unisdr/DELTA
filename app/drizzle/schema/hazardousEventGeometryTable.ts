import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	customType,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { hazardousEventTable } from "../../modules/hazardous-event/infrastructure/db/schema";

const geometryType = customType<{ data: unknown }>({
	dataType: () => "geometry(GEOMETRY,4326)",
});

export const hazardousEventGeometryTable = pgTable(
	"hazardous_event_geometry",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		hazardousEventId: uuid("hazardous_event_id")
			.notNull()
			.references(() => hazardousEventTable.id, { onDelete: "cascade" }),
		geometry: geometryType().notNull().$type<unknown>(),
		geometryType: text("geometry_type").notNull(),
		name: text("name"),
		source: text("source"),
		isPrimary: boolean("is_primary").notNull().default(false),
		validFrom: timestamp("valid_from"),
		validTo: timestamp("valid_to"),
		createdAt: timestamp("created_at")
			.notNull()
			.default(sql`now()`),
		createdBy: uuid("created_by"),
	},
	(table) => [
		check(
			"hazardous_event_geometry_geometry_type_chk",
			sql`${table.geometryType} IN ('POINT', 'LINESTRING', 'POLYGON', 'MULTIPOLYGON')`,
		),
		sql`CREATE UNIQUE INDEX IF NOT EXISTS "hazardous_event_geometry_one_primary_per_event_idx" ON "hazardous_event_geometry" ("hazardous_event_id") WHERE "is_primary" = true`,
		sql`CREATE INDEX IF NOT EXISTS "hazardous_event_geometry_geometry_gist_idx" ON "hazardous_event_geometry" USING GIST ("geometry")`,
	],
);

export type SelectHazardousEventGeometry =
	typeof hazardousEventGeometryTable.$inferSelect;
export type InsertHazardousEventGeometry =
	typeof hazardousEventGeometryTable.$inferInsert;

export const hazardousEventGeometryRel = relations(
	hazardousEventGeometryTable,
	({ one }) => ({
		hazardousEvent: one(hazardousEventTable, {
			fields: [hazardousEventGeometryTable.hazardousEventId],
			references: [hazardousEventTable.id],
		}),
	}),
);
