import { relations, sql } from "drizzle-orm";
import {
	customType,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { disasterEventTable } from "./disasterEventTable";
import { divisionTable } from "./divisionTable";

const geomType = customType<{ data: unknown }>({
	dataType: () => "geometry(Geometry,4326)",
});

export const disasterEventGeographyTable = pgTable("disaster_event_geography", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	disasterEventId: uuid("disaster_event_id").references(
		() => disasterEventTable.id,
		{ onDelete: "cascade" },
	),
	geom: geomType().$type<null>(),
	divisionId: uuid("division_id").references(() => divisionTable.id, {
		onDelete: "set null",
	}),
	source: text("source", { enum: ["manual", "derived_from_division"] })
		.notNull()
		.default("manual"),
	createdAt: timestamp("created_at")
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at")
		.notNull()
		.default(sql`now()`),
});

export type SelectDisasterEventGeography =
	typeof disasterEventGeographyTable.$inferSelect;
export type InsertDisasterEventGeography =
	typeof disasterEventGeographyTable.$inferInsert;

export const disasterEventGeographyRel = relations(
	disasterEventGeographyTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterEventGeographyTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
		division: one(divisionTable, {
			fields: [disasterEventGeographyTable.divisionId],
			references: [divisionTable.id],
		}),
	}),
);
