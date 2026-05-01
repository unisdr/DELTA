import { Tx } from "~/db.server";

import { sql, eq, and, isNotNull } from "drizzle-orm";

import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { humanDsgTable } from "~/drizzle/schema/humanDsgTable";

import { HumanEffectsCustomDef } from "~/frontend/human_effects/defs";

// Maps database column names to JavaScript property names for built-in disaggregation columns.
// Used to check which columns have data, to prevent hiding columns that contain data.
export const builtinDsgColumns = [
	{ dbName: "sex", jsName: "sex" },
	{ dbName: "age", jsName: "age" },
	{ dbName: "disability", jsName: "disability" },
	{ dbName: "global_poverty_line", jsName: "globalPovertyLine" },
	{ dbName: "national_poverty_line", jsName: "nationalPovertyLine" },
] as const;

// Returns the set of built-in disaggregation column names that contain data for a given country account.
// This prevents users from hiding columns that have existing data, which would corrupt the data integrity.
// Scans human_dsg table for non-null values in each built-in column, filtered by country_accounts_id.
export async function getUsedBuiltinColumns(
	tx: Tx,
	countryAccountsId: string,
): Promise<Set<string>> {
	const usedColumns = new Set<string>();

	for (const col of builtinDsgColumns) {
		const rows = await tx
			.select({ id: humanDsgTable.id })
			.from(humanDsgTable)
			.innerJoin(
				disasterRecordsTable,
				eq(humanDsgTable.recordId, disasterRecordsTable.id),
			)
			.where(
				and(
					isNotNull((humanDsgTable as any)[col.jsName]),
					eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
				),
			)
			.limit(1);
		if (rows.length > 0) {
			usedColumns.add(col.dbName);
		}
	}

	return usedColumns;
}

export interface UsedCustomColumnsAndValues {
	columns: string[];
	valuesByColumn: Record<string, string[]>;
}

// Returns which custom disaggregation columns and specific enum values are in use.
// This prevents users from deleting columns or enum values that have existing data.
// Custom columns are stored as JSONB in human_dsg.custom, where keys are column names
// and values are the selected enum values.
// Uses PostgreSQL JSON functions for efficiency: jsonb_object_keys extracts column names,
// jsonb_each_text expands key-value pairs, aggregated with array_agg(DISTINCT).
// Filters out null values - a column with only null values is not considered "in use".
export async function getUsedCustomColumnsAndValues(
	tx: Tx,
	countryAccountsId: string,
): Promise<UsedCustomColumnsAndValues> {
	const valuesRes = await tx.execute(sql`
		SELECT kv.key as column_name, array_agg(DISTINCT kv.value) FILTER (WHERE kv.value IS NOT NULL) as values
		FROM human_dsg
		CROSS JOIN LATERAL jsonb_each_text(human_dsg.custom) as kv
		INNER JOIN disaster_records ON disaster_records.id = human_dsg.record_id
		WHERE human_dsg.custom IS NOT NULL
		AND human_dsg.custom != '{}'::jsonb
		AND disaster_records.country_accounts_id = ${countryAccountsId}
		GROUP BY kv.key
		HAVING COUNT(*) FILTER (WHERE kv.value IS NOT NULL) > 0
	`);

	const columns: string[] = [];
	const valuesByColumn: Record<string, string[]> = {};

	for (const row of valuesRes.rows) {
		columns.push(row.column_name as string);
		valuesByColumn[row.column_name as string] = row.values as string[];
	}

	return { columns, valuesByColumn };
}

export interface ValidateCustomConfigError {
	code: string;
	column?: string;
	value?: string;
}

// Validates changes to custom disaggregation column configuration.
// Returns an error if attempting to delete a column or enum value that has existing data.
// This protects data integrity by preventing configuration changes that would orphan data references.
// Allows adding new columns/values and modifying UI labels, but blocks deletion of in-use items.
export async function validateCustomConfigChanges(
	tx: Tx,
	countryAccountsId: string,
	currentConfig: HumanEffectsCustomDef[] | null,
	newConfig: HumanEffectsCustomDef[] | null,
): Promise<ValidateCustomConfigError | null> {
	const currentDefs = currentConfig || [];
	const newDefs = newConfig || [];

	const { columns: usedColumns, valuesByColumn } =
		await getUsedCustomColumnsAndValues(tx, countryAccountsId);

	const currentDbNames = new Set(currentDefs.map((d) => d.dbName));
	const newDbNames = new Set(newDefs.map((d) => d.dbName));

	for (const dbName of currentDbNames) {
		if (!newDbNames.has(dbName) && usedColumns.includes(dbName)) {
			return {
				code: "cannot_delete_column_with_data",
				column: dbName,
			};
		}
	}

	const currentDefMap = new Map<string, HumanEffectsCustomDef>();
	for (const def of currentDefs) {
		currentDefMap.set(def.dbName, def);
	}

	for (const newDef of newDefs) {
		const currentDef = currentDefMap.get(newDef.dbName);
		if (currentDef) {
			const usedValues = valuesByColumn[newDef.dbName] || [];
			const currentKeys = new Set(currentDef.enum.map((e) => e.key));
			const newKeys = new Set(newDef.enum.map((e) => e.key));

			for (const oldKey of currentKeys) {
				if (!newKeys.has(oldKey) && usedValues.includes(oldKey)) {
					return {
						code: "cannot_remove_value_with_data",
						column: newDef.dbName,
						value: oldKey,
					};
				}
			}
		}
	}

	return null;
}
