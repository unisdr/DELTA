import { sql } from "drizzle-orm";
import {
	timestamp,
	text,
	boolean,
	jsonb,
	bigint,
	numeric,
	uuid,
	AnyPgColumn,
} from "drizzle-orm/pg-core";
import { hipHazardTable } from "../drizzle/schema/hipHazardTable";
import { hipClusterTable } from "../drizzle/schema/hipClusterTable";
import { hipTypeTable } from "../drizzle/schema/hipTypeTable";

export function zeroTimestamp(name: string) {
	return timestamp(name)
		.notNull()
		.default(sql`'2000-01-01T00:00:00.000Z'`);
}
export function zeroText(name: string) {
	return text(name).notNull().default("");
}
export function zeroBool(name: string) {
	return boolean(name).notNull().default(false);
}
export function zeroStrMap(name: string) {
	return jsonb(name).$type<Record<string, string>>().default({}).notNull();
}
export function ourBigint(name: string) {
	return bigint(name, { mode: "number" });
}
export function ourMoney(name: string) {
	return numeric(name);
}
export function ourRandomUUID() {
	return uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`);
}
export const createdUpdatedTimestamps = {
	updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
};
export const approvalFields = {
	// drizzle has broken postgres enum support
	// using text column instead
	// https://github.com/drizzle-team/drizzle-orm/issues/3485
	approvalStatus: text({
		enum: [
			"draft",
			"waiting-for-validation",
			"needs-revision",
			"validated",
			"published",
		],
	})
		.notNull()
		.default("draft"),
};
export const approvalWorkflowFields = {
	createdByUserId: uuid("created_by_user_id"),
	updatedByUserId: uuid("updated_by_user_id"),
	submittedByUserId: uuid("submitted_by_user_id"),
	submittedAt: timestamp("submitted_at"),
	validatedByUserId: uuid("validated_by_user_id"),
	validatedAt: timestamp("validated_at"),
	publishedByUserId: uuid("published_by_user_id"),
	publishedAt: timestamp("published_at"),
};
// need function wrapper to avoid unique relation drizzle error
export function apiImportIdField() {
	return {
		apiImportId: text("api_import_id"),
	};
}
export function hipRelationColumnsRequired() {
	return {
		hipHazardId: text("hip_hazard_id").references(
			(): AnyPgColumn => hipHazardTable.id,
		),
		hipClusterId: text("hip_cluster_id").references(
			(): AnyPgColumn => hipClusterTable.id,
		),
		hipTypeId: text("hip_type_id")
			.references((): AnyPgColumn => hipTypeTable.id)
			.notNull(),
	};
}
export function hipRelationColumnsOptional() {
	return {
		hipHazardId: text("hip_hazard_id").references(
			(): AnyPgColumn => hipHazardTable.id,
		),
		hipClusterId: text("hip_cluster_id").references(
			(): AnyPgColumn => hipClusterTable.id,
		),
		hipTypeId: text("hip_type_id").references(
			(): AnyPgColumn => hipTypeTable.id,
		),
	};
}
export function unitsEnum(name: string) {
	return text(name, {
		enum: [
			"number_count",
			"area_m2",
			"area_km2",
			"area_ha",
			"area_mi2",
			"area_ac",
			"area_ft2",
			"area_yd2",
			"volume_l",
			"volume_m3",
			"volume_ft3",
			"volume_yd3",
			"volume_gal",
			"volume_bbl",
			"duration_days",
			"duration_hours",
		],
	});
}
