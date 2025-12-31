import { EnumEntry, ETLocalizedString, ColWidth } from "~/frontend/editabletable/base"
import { DContext } from "~/util/dcontext"

export type HumanEffectsTable = "Deaths" | "Injured" | "Missing" | "Affected" | "Displaced"

export function HumanEffectsTableFromString(s: string): HumanEffectsTable {
	switch (s) {
		case "Deaths":
		case "Injured":
		case "Missing":
		case "Affected":
		case "Displaced":
			return s
	}
	throw new Error("Unknown human effects table: " + s)
}

export interface HumanEffectTableDef {
	id: HumanEffectsTable
	label: string
}

export const getHumanEffectTableDefs = (ctx: DContext): HumanEffectTableDef[] => [
	{ id: "Deaths", label: ctx.t({ "code": "human_effects.deaths", "msg": "Deaths" }) },
	{ id: "Injured", label: ctx.t({ "code": "human_effects.injured", "msg": "Injured" }) },
	{ id: "Missing", label: ctx.t({ "code": "human_effects.missing", "msg": "Missing" }) },
	{ id: "Affected", label: ctx.t({ "code": "human_effects.affected", "msg": "Affected" }) },
	{ id: "Displaced", label: ctx.t({ "code": "human_effects.displaced", "msg": "Displaced" }) },
];

export interface HumanEffectsCustomDef {
	uiName: ETLocalizedString | string
	uiColWidth: ColWidth
	dbName: string
	enum: EnumEntry[]
}

export interface HumanEffectsCustomConfig {
	version: number
	config: HumanEffectsCustomDef[]
}

export interface HumanEffectsHidden {
	cols: string[]
}

