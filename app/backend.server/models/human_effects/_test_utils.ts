// Shared test utilities for human effects tests
import { sql } from "drizzle-orm";
import { dr } from "~/db.server";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { injuredTable } from "~/drizzle/schema/injuredTable";
import { humanCategoryPresenceTable } from "~/drizzle/schema/humanCategoryPresenceTable";
import { humanDsgTable } from "~/drizzle/schema/humanDsgTable";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import {
	createTestDisasterRecord1,
	testDisasterRecord1Id,
	testCountryAccountsId,
} from "../disaster_record_test";
import { Def } from "~/frontend/editabletable/base";

export const rid1 = testDisasterRecord1Id;
export const countryAccountsId = testCountryAccountsId;
export { testDisasterRecord1Id };

export const defs1: Def[] = [
	{
		shared: true,
		uiName: "Sex",
		jsName: "sex",
		dbName: "sex",
		format: "enum",
		role: "dimension",
		data: [
			{ key: "m", label: "Male" },
			{ key: "f", label: "Female" },
		],
	},
	{
		uiName: "Injured",
		jsName: "injured",
		dbName: "injured",
		format: "number",
		role: "metric",
	},
];

export const defs2: Def[] = [
	{
		uiName: "As of",
		jsName: "asOf",
		dbName: "as_of",
		format: "date",
		role: "dimension",
	},
	{
		uiName: "Missing",
		jsName: "missing",
		dbName: "missing",
		format: "number",
		role: "metric",
	},
];

export const defsCustom: Def[] = [
	{
		uiName: "custom",
		jsName: "custom",
		dbName: "custom",
		custom: true,
		format: "enum",
		role: "dimension",
		data: [
			{ key: "g1", label: "G1" },
			{ key: "g2", label: "G2" },
		],
	},
	{
		uiName: "Injured",
		jsName: "injured",
		dbName: "injured",
		format: "number",
		role: "metric",
	},
];

export async function resetTestData() {
	await dr.execute(
		sql`TRUNCATE ${humanDsgTable}, ${injuredTable}, ${disasterRecordsTable}, ${disasterEventTable}, ${hazardousEventTable} CASCADE`,
	);
	await createTestDisasterRecord1(dr);
}

export async function resetCategoryPresenceData() {
	await dr.execute(
		sql`TRUNCATE ${humanCategoryPresenceTable}, ${disasterRecordsTable}, ${disasterEventTable}, ${hazardousEventTable} CASCADE`,
	);
	await createTestDisasterRecord1(dr);
}
