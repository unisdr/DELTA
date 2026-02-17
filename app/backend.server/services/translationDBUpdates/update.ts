import { getTranslationSources } from "./sources";
import fs from "fs";
import { basename } from "path";
import { dr } from "~/db.server";

// Import your tables
import { dtsSystemInfoTable } from "~/drizzle/schema/dtsSystemInfoTable";
import { sectorTable } from "~/drizzle/schema/sectorTable";
import { categoriesTable } from "~/drizzle/schema/categoriesTable";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { hipTypeTable } from "~/drizzle/schema/hipTypeTable";
import { assetTable } from "~/drizzle/schema/assetTable";
import { eq, sql } from "drizzle-orm";
import path from "path";

type TranslationMapEntry = {
	table: any; // Drizzle table definition (drizzle obj)
	column: string; // JSONB column in that table (name in drizzle schema)
};

type UpdateItem = {
	type: string;
	id: string;
	lang: string;
	translation: string;
};

interface RowTranslationUpdate {
	table: any; // Drizzle table object
	column: string; // Column name (e.g. "name", "description")
	id: string; // The record ID
	translations: Record<string, string>; // { lang: translation }
}

function getTranslationFiles(): string[] {
	const localeDir = path.resolve(process.cwd(), "locales", "content");

	if (!fs.existsSync(localeDir)) {
		console.warn("Locale directory not found:", localeDir);
		return [];
	}

	return fs
		.readdirSync(localeDir)
		.filter((f) => f.endsWith(".json") && f !== "en.json")
		.map((f) => path.join(localeDir, f));
}

async function shouldImportTranslations(): Promise<boolean> {
	const files = getTranslationFiles();
	if (files.length === 0) {
		console.log("No language files found.");
		return false;
	}

	// Get last import time from dtsSystemInfo (single row)
	const systemInfoRows = await dr.select().from(dtsSystemInfoTable);

	if (systemInfoRows.length === 0) {
		console.error(
			"No system info row found in dts_system_info. System non inited, skipping language imports for now",
		);
		return false;
	}
	if (systemInfoRows.length > 1) {
		throw new Error("Multiple rows found in dts_system_info. Expected exactly one.");
	}
	const systemInfo = systemInfoRows[0];

	const lastImportTime = systemInfo.lastTranslationImportAt
		? new Date(systemInfo.lastTranslationImportAt)
		: null;

	if (!lastImportTime) {
		return true; // First time run
	}

	// Check if any translation file is newer than last import
	for (const file of files) {
		const fileMtime = fs.statSync(file).mtime;
		if (fileMtime > lastImportTime) {
			console.log("Translation files updated, will re-import");
			return true;
		}
	}

	console.log("No translation files updated since last import. Skipping.");
	return false;
}

export async function setLastTranslationImportAt(timestamp: Date): Promise<void> {
	const rows = await dr.select().from(dtsSystemInfoTable);

	if (rows.length === 0) {
		throw new Error("No system info row found in dts_system_info. Expected exactly one.");
	}
	if (rows.length > 1) {
		throw new Error("Multiple rows found in dts_system_info. Expected exactly one.");
	}
	const row = rows[0];
	await dr
		.update(dtsSystemInfoTable)
		.set({ lastTranslationImportAt: timestamp })
		.where(eq(dtsSystemInfoTable.id, row.id));
}

export async function importTranslationsIfNeeded() {
	const now = new Date();

	console.log("Checking if importing translation is needed.");
	const shouldImport = await shouldImportTranslations();
	if (!shouldImport) {
		return;
	}
	console.log("Import needed");

	console.log("Fetching current translation keys to validate...");
	const currentTranslations = await getTranslationSources();

	const validIds = new Set<string>(currentTranslations.map((t) => t.id));

	const files = getTranslationFiles();
	if (files.length === 0) {
		console.log("No language files found.");
		return;
	}

	let outdatedCount = 0;

	const typeToTable: Record<string, TranslationMapEntry> = {
		"hip_type.name": {
			table: hipTypeTable,
			column: "name",
		},
		"hip_cluster.name": {
			table: hipClusterTable,
			column: "name",
		},
		"hip_hazard.name": {
			table: hipHazardTable,
			column: "name",
		},
		"sector.name": {
			table: sectorTable,
			column: "name",
		},
		"sector.description": {
			table: sectorTable,
			column: "description",
		},
		"asset.name": {
			table: assetTable,
			column: "builtInName",
		},
		"asset.category": {
			table: assetTable,
			column: "builtInCategory",
		},
		"asset.notes": {
			table: assetTable,
			column: "builtInNotes",
		},
		"categories.name": {
			table: categoriesTable,
			column: "name",
		},
	};

	const updates: UpdateItem[] = [];

	for (const file of files) {
		const name = basename(file);
		const lang = name.replace(".json", "");

		let items;
		try {
			items = JSON.parse(fs.readFileSync(file, "utf8"));
		} catch (err) {
			console.error(`Failed to read: ${name}`);
			continue;
		}
		if (!Array.isArray(items)) {
			console.error(`Invalid JSON format (not an array): ${name}`);
			continue;
		}

		console.log(`Processing ${items.length} entries from ${name}`);

		for (const item of items) {
			// Skip if not currently valid (hash mismatch = outdated)
			if (!validIds.has(item.id)) {
				console.warn(`Skipping outdated translation: ${item.id}`);
				outdatedCount++;
				continue;
			}

			const parts = item.id.split(".");
			if (parts.length < 3) continue;
			parts.pop(); // hash not needed
			const originalId = parts.pop();
			const type = parts.join(".");

			if (!typeToTable[type]) {
				console.warn(`Unknown type: ${type}`);
				continue;
			}

			updates.push({
				type,
				id: originalId,
				lang,
				translation: item.translation,
			});
		}
	}
	console.log(`Skipped ${outdatedCount} outdated translation entries.`);

	const grouped = new Map<string, RowTranslationUpdate>();

	for (const u of updates) {
		const key = `${u.type}:${u.id}`;
		const { table, column } = typeToTable[u.type];

		let entry = grouped.get(key);
		if (!entry) {
			entry = { table, column, id: u.id, translations: {} };
			grouped.set(key, entry);
		}
		entry.translations[u.lang] = u.translation;
	}

	for (const { table, column, id, translations } of grouped.values()) {
		await dr
			.update(table)
			.set({
				[column]: sql`${table[column]} || ${JSON.stringify(translations)}::jsonb`,
			})
			.where(eq(table["id"], id));
	}

	await setLastTranslationImportAt(now);

	const elapsed = Date.now() - now.getTime();
	console.log("Translation import complete.", "time_ms", elapsed);
}
