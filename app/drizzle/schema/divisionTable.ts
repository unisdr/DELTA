import { sql, relations } from "drizzle-orm";
import {
	pgTable,
	text,
	uuid,
	AnyPgColumn,
	jsonb,
	customType,
	index,
	uniqueIndex,
	check,
} from "drizzle-orm/pg-core";
import { ourRandomUUID, zeroStrMap, ourBigint } from "../../utils/drizzleUtil";
import { countryAccounts } from "./countryAccounts";

export const divisionTable = pgTable(
	"division",
	{
		id: ourRandomUUID(),
		importId: text("import_id"),
		nationalId: text("national_id"),
		parentId: uuid("parent_id").references((): AnyPgColumn => divisionTable.id),
		countryAccountsId: uuid("country_accounts_id").references(() => countryAccounts.id),
		name: zeroStrMap("name"),
		geojson: jsonb("geojson"),
		level: ourBigint("level"), // value is parent level + 1 otherwise 1

		geom: customType<{ data: unknown }>({
			dataType: () => "geometry(Geometry,4326)",
		})().$type<null>(),

		bbox: customType<{ data: unknown }>({
			dataType: () => "geometry(Geometry,4326)",
		})().$type<null>(),

		spatial_index: text("spatial_index").$type<null>(),
	},
	(table) => {
		return [
			index("parent_idx").on(table.parentId),
			index("division_level_idx").on(table.level),

			// Tenant-scoped unique constraints
			uniqueIndex("tenant_import_id_idx").on(table.countryAccountsId, table.importId),
			uniqueIndex("tenant_national_id_idx").on(table.countryAccountsId, table.nationalId),

			// Create GIST indexes via raw SQL since drizzle doesn't support USING clause directly
			sql`CREATE INDEX IF NOT EXISTS "division_geom_idx" ON "division" USING GIST ("geom")`,
			sql`CREATE INDEX IF NOT EXISTS "division_bbox_idx" ON "division" USING GIST ("bbox")`,

			// Ensure all geometries are valid
			check("valid_geom_check", sql`ST_IsValid(geom)`),
		];
	},
);

export const divisionParent_Rel = relations(divisionTable, ({ one }) => ({
	divisionParent: one(divisionTable, {
		fields: [divisionTable.parentId],
		references: [divisionTable.id],
	}),
}));

export type SelectDivision = typeof divisionTable.$inferSelect;
export type InsertDivision = typeof divisionTable.$inferInsert;
