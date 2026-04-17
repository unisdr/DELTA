import { displacedTable } from "~/drizzle/schema/displacedTable";
import { affectedTable } from "~/drizzle/schema/affectedTable";
import { missingTable } from "~/drizzle/schema/missingTable";
import { injuredTable } from "~/drizzle/schema/injuredTable";
import { deathsTable } from "~/drizzle/schema/deathsTable";

import { HumanEffectsTable } from "~/frontend/human_effects/defs";

export function tableFromType(t: HumanEffectsTable): any {
	switch (t) {
		default:
			throw new Error("invalid table type: " + t);
		case "Deaths":
			return deathsTable;
		case "Injured":
			return injuredTable;
		case "Missing":
			return missingTable;
		case "Affected":
			return affectedTable;
		case "Displaced":
			return displacedTable;
	}
}

export function tableDBName(t: HumanEffectsTable): any {
	switch (t) {
		default:
			throw new Error("invalid table type: " + t);
		case "Deaths":
		case "Injured":
		case "Missing":
		case "Affected":
		case "Displaced":
			return t.toLowerCase();
	}
}

export function tableJsName(t: HumanEffectsTable): any {
	// js and db name are the same, since 1 word only now
	return tableDBName(t);
}
