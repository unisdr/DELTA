import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema/sectorTable";
import { categoriesTable } from "~/drizzle/schema/categoriesTable";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { hipTypeTable } from "~/drizzle/schema/hipTypeTable";
import { assetTable } from "~/drizzle/schema/assetTable";
import { isNotNull, eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

export type TranslationItem = {
	id: string;
	msg: string;
};

export type TranslationSource = {
	type: string;
	query: () => Promise<TranslationItem[]>;
};

export type TranslationKeyInfo = {
	id: string; // Full deterministic ID (with hash)
	msg: string; // English source text
	type: string; // Type key, e.g. "asset.name"
	originalId: string; // The DB record ID
};

// Export all current translation sources
export async function getTranslationSources(): Promise<TranslationKeyInfo[]> {
	const sources: TranslationSource[] = [
		{
			type: "hip_type.name",
			query: async () => {
				const rows = await dr
					.select({
						id: hipTypeTable.id,
						msg: sql<string>`(${hipTypeTable.name}->>'en')`,
					})
					.from(hipTypeTable);
				return rows;
			},
		},
		{
			type: "hip_cluster.name",
			query: async () => {
				const rows = await dr
					.select({
						id: hipClusterTable.id,
						msg: sql<string>`(${hipClusterTable.name}->>'en')`,
					})
					.from(hipClusterTable);
				return rows;
			},
		},
		{
			type: "hip_hazard.name",
			query: async () => {
				const rows = await dr
					.select({
						id: hipHazardTable.id,
						msg: sql<string>`(${hipHazardTable.name}->>'en')`,
					})
					.from(hipHazardTable);
				return rows;
			},
		},
		{
			type: "sector.name",
			query: async () => {
				const rows = await dr
					.select({
						id: sectorTable.id,
						msg: sql<string>`(${sectorTable.name}->>'en')`,
					})
					.from(sectorTable);
				return rows;
			},
		},
		{
			type: "sector.description",
			query: async () => {
				const rows = await dr
					.select({
						id: sectorTable.id,
						msg: sql<string>`(${sectorTable.description}->>'en')`,
					})
					.from(sectorTable)
					.where(isNotNull(sectorTable.description));
				return rows.map((r) => ({ id: r.id, msg: r.msg || "" }));
			},
		},
		{
			type: "asset.name",
			query: async () => {
				const rows = await dr
					.select({
						id: assetTable.id,
						msg: sql<string>`(${assetTable.builtInName}->>'en')`,
					})
					.from(assetTable)
					.where(eq(assetTable.isBuiltIn, true));
				return rows;
			},
		},
		{
			type: "asset.category",
			query: async () => {
				const rows = await dr
					.select({
						id: assetTable.id,
						msg: sql<string>`(${assetTable.builtInCategory}->>'en')`,
					})
					.from(assetTable)
					.where(eq(assetTable.isBuiltIn, true));
				return rows;
			},
		},
		{
			type: "asset.notes",
			query: async () => {
				const rows = await dr
					.select({
						id: assetTable.id,
						msg: sql<string>`(${assetTable.builtInNotes}->>'en')`,
					})
					.from(assetTable)
					.where(eq(assetTable.isBuiltIn, true));
				return rows;
			},
		},
		{
			type: "categories.name",
			query: async () => {
				const rows = await dr
					.select({
						id: categoriesTable.id,
						msg: sql<string>`(${categoriesTable.name}->>'en')`,
					})
					.from(categoriesTable);
				return rows;
			},
		},
	];

	const results: TranslationKeyInfo[] = [];

	for (const src of sources) {
		console.log("Querying", src.type);
		const rows = await src.query();
		for (const row of rows) {
			if (!row.msg) {
				continue;
			}
			const fullId = createId(src.type, String(row.id), row.msg);
			results.push({
				id: fullId,
				msg: row.msg,
				type: src.type,
				originalId: String(row.id),
			});
		}
	}
	console.log("Done with all queries");

	return results;
}

// Deterministic ID generator
export function createId(
	type: string,
	originalId: string,
	msg: string,
): string {
	const hash = createHash("sha256").update(msg).digest("hex").slice(0, 6);
	return `${type}.${originalId}.${hash}`;
}
