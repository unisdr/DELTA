import { relations, sql } from "drizzle-orm";
import { customType, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { disasterEventTable } from "./disasterEventTable";

const geomType = customType<{ data: unknown }>({
	dataType: () => "geometry(Geometry,4326)",
});

export const disasterEventGeometryTable = pgTable("disaster_event_geometry", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	disasterEventId: uuid("disaster_event_id").references(
		() => disasterEventTable.id,
		{ onDelete: "cascade" },
	),
	geom: geomType().$type<null>(),
	createdAt: timestamp("created_at")
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at")
		.notNull()
		.default(sql`now()`),
});

export type SelectDisasterEventGeometry =
	typeof disasterEventGeometryTable.$inferSelect;
export type InsertDisasterEventGeometry =
	typeof disasterEventGeometryTable.$inferInsert;

export const disasterEventGeometryRel = relations(
	disasterEventGeometryTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterEventGeometryTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
	}),
);
