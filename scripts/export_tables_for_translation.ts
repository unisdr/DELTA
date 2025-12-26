import { initDB, dr } from "~/db.server";
import {
	hipTypeTable,
	hipClusterTable,
	hipHazardTable,
	sectorTable,
	assetTable
} from "~/drizzle/schema";
import { isNotNull, eq } from 'drizzle-orm';
import { loadEnvFile } from "~/util/env";
import fs from "fs";
import { dirname } from "path";
import { createHash } from "crypto";

// Define the shape of a translation source
type TranslationSource = {
	type: string;
	query: () => Promise<Array<{ id: string; msg: string }>>;
};

main().catch(console.error);

async function main() {
	loadEnvFile("");
	initDB();

	// Define your sources declaratively
	const sources: TranslationSource[] = [
		{
			type: "hip_type.name",
			query: async () => {
				const rows = await dr
					.select({
						id: hipTypeTable.id,
						msg: hipTypeTable.nameEn,
					})
					.from(hipTypeTable);
				return rows.map((r) => ({
					id: String(r.id),
					msg: r.msg,
				}));
			},
		},
		{
			type: "hip_cluster.name",
			query: async () => {
				const rows = await dr
					.select({
						id: hipClusterTable.id,
						msg: hipClusterTable.nameEn,
					})
					.from(hipClusterTable);
				return rows.map((r) => ({
					id: String(r.id),
					msg: r.msg,
				}));
			},
		},
		{
			type: "hip_hazard.name",
			query: async () => {
				const rows = await dr
					.select({
						id: hipHazardTable.id,
						msg: hipHazardTable.nameEn,
					})
					.from(hipHazardTable);
				return rows.map((r) => ({
					id: String(r.id),
					msg: r.msg,
				}));
			},
		},
		{
			type: "sector.name",
			query: async () => {
				const rows = await dr
					.select({
						id: sectorTable.id,
						msg: sectorTable.sectorname,
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
						msg: sectorTable.description,
					})
					.from(sectorTable)
					.where(isNotNull(sectorTable.description))
				return rows.map((r) => ({
					id: String(r.id),
					msg: r.msg || "",
				}));

			},
		},
		{
			type: "asset.name",
			query: async () => {
				const rows = await dr
					.select({
						id: assetTable.id,
						msg: assetTable.name,
					})
					.from(assetTable)
					.where(eq(assetTable.isBuiltIn, true))
				return rows;
			},
		}
	];

	// Process all sources → combine into one
	const allItems: Array<{ id: string; translation: string }> = [];

	for (const source of sources) {
		const normalized = await source.query();
		const items = normalized.map((item) => convertItem(item, source.type));
		allItems.push(...items);
	}

	// Sort all items by `id` (code) alphabetically
	allItems.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

	const filePath = "app/locales/content/en.json";
	const dir = dirname(filePath);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(allItems, null, 2));

	console.log(`All translations saved to: ${filePath}`);
	
	// Close DB connection - this prevents the hang
  await dr.$client.end();
}

// Converts { id, msg } → { id: "type.id.hash", translation: msg }
function convertItem(
	item: { id: string; msg: string },
	type: string
): { id: string; translation: string } {
	// Create a short, deterministic hash of the translation text
	const hash = createHash("sha256").update(item.msg).digest("hex").slice(0, 6); // 6 chars

	const id = `${type}.${item.id}.${hash}`;
	return {
		id,
		translation: item.msg,
	};
}
