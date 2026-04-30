import { Tx } from "~/db.server";

import { eq } from "drizzle-orm";

import { humanDsgConfigTable } from "~/drizzle/schema/humanDsgConfigTable";

import { Def } from "~/frontend/editabletable/base";

import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import { BackendContext } from "../../context";

async function getHidden(tx: Tx) {
	let row = await tx.query.humanDsgConfigTable.findFirst();
	return new Set(row?.hidden?.cols || []);
}

export type SplitRes = {
	defs: { shared: Def[]; custom: Def[]; notShared: Def[] };
	splitRow: (data: any[]) => {
		shared: any[];
		notShared: any[];
		custom: Map<string, any>;
	};
};

export function splitDefsByShared(defs: Def[]): SplitRes {
	let custom: Def[] = [];
	let shared: Def[] = [];
	let notShared: Def[] = [];

	for (let i = 0; i < defs.length; i++) {
		if (defs[i].custom) {
			custom.push(defs[i]);
		} else if (defs[i].shared) {
			shared.push(defs[i]);
		} else {
			notShared.push(defs[i]);
		}
	}

	const splitRow = (data: any[]) => {
		let custom = new Map<string, any>();
		let shared: any[] = [];
		let notShared: any[] = [];
		for (let i = 0; i < defs.length; i++) {
			let d = defs[i];
			if (d.custom) {
				custom.set(d.dbName, data[i]);
			} else if (d.shared) {
				shared.push(data[i]);
			} else {
				notShared.push(data[i]);
			}
		}
		return {
			custom,
			shared,
			notShared,
		};
	};

	return { defs: { shared, custom, notShared }, splitRow };
}

export function sharedDefsAll(ctx: BackendContext): Def[] {
	let shared: Def[] = [
		{
			uiName: ctx.t({
				code: "human_effects.sex",
				desc: "Sex (Possible values: male, female, other non-binary)",
				msg: "Sex",
			}),
			jsName: "sex",
			dbName: "sex",
			uiColWidth: "medium", // 90
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "m",
					label: ctx.t({
						code: "human_effects.sex.m",
						desc: "Abbreviation for male sex. Format: 'Letter-Description' (e.g. M-Male).",
						msg: "M-Male",
					}),
				},
				{
					key: "f",
					label: ctx.t({
						code: "human_effects.sex.f",
						desc: "Abbreviation for female sex. Format: 'Letter-Description' (e.g. F-Female).",
						msg: "F-Female",
					}),
				},
				{
					key: "o",
					label: ctx.t({
						code: "human_effects.sex.o",
						desc: "Abbreviation for other non-binary sex. Format: 'Letter-Description' (e.g. O-Other Non-binary).",
						msg: "O-Other Non-binary",
					}),
				},
			],
		},
		{
			uiName: ctx.t({
				code: "human_effects.age",
				desc: "Age of the person in years.",
				msg: "Age",
			}),
			jsName: "age",
			dbName: "age",
			uiColWidth: "medium", // 90
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "0-14",
					label: ctx.t({
						code: "human_effects.age_group.children",
						desc: "Age group for children, from 0 to 14 years old.",
						msg: "Children, (0-14)",
					}),
				},
				{
					key: "15-64",
					label: ctx.t({
						code: "human_effects.age_group.adult",
						desc: "Age group for adults, from 15 to 64 years old.",
						msg: "Adult, (15-64)",
					}),
				},
				{
					key: "65+",
					label: ctx.t({
						code: "human_effects.age_group.elder",
						desc: "Age group for elderly, 65 years and older. Display uses (65-) format.",
						msg: "Elder (65-)",
					}),
				},
			],
		},
		{
			uiName: ctx.t({
				code: "human_effects.disability",
				desc: "Whether the person has a disability",
				msg: "Disability",
			}),
			jsName: "disability",
			dbName: "disability",
			uiColWidth: "wide", // 120
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "none",
					label: ctx.t({
						code: "human_effects.disability.none",
						msg: "No disabilities",
					}),
				},
				{
					key: "physical_dwarfism",
					label: ctx.t({
						code: "human_effects.disability.physical_dwarfism",
						desc: "Type of disability.",
						msg: "Physical, dwarfism",
					}),
				},
				{
					key: "physical_problems_in_body_functioning",
					label: ctx.t({
						code: "human_effects.disability.physical_problems_in_body_functioning",
						desc: "Type of disability.",
						msg: "Physical, Problems in body functioning",
					}),
				},
				{
					key: "physical_problems_in_body_structures",
					label: ctx.t({
						code: "human_effects.disability.physical_problems_in_body_structures",
						desc: "Type of disability.",
						msg: "Physical, Problems in body structures",
					}),
				},
				{
					key: "physical_other_physical_disability",
					label: ctx.t({
						code: "human_effects.disability.physical_other_physical_disability",
						desc: "Type of disability.",
						msg: "Physical, Other physical disability",
					}),
				},
				{
					key: "sensorial_visual_impairments_blindness",
					label: ctx.t({
						code: "human_effects.disability.sensorial_visual_impairments_blindness",
						desc: "Type of disability.",
						msg: "Sensorial, visual impairments, blindness",
					}),
				},
				{
					key: "sensorial_visual_impairments_partial_sight_loss",
					label: ctx.t({
						code: "human_effects.disability.sensorial_visual_impairments_partial_sight_loss",
						desc: "Type of disability.",
						msg: "Sensorial, visual impairments, partial sight loss",
					}),
				},
				{
					key: "sensorial_visual_impairments_colour_blindness",
					label: ctx.t({
						code: "human_effects.disability.sensorial_visual_impairments_colour_blindness",
						desc: "Type of disability.",
						msg: "Sensorial, visual impairments, colour blindness",
					}),
				},
				{
					key: "sensorial_hearing_impairments_deafness_hard_of_hearing",
					label: ctx.t({
						code: "human_effects.disability.sensorial_hearing_impairments_deafness_hard_of_hearing",
						desc: "Type of disability.",
						msg: "Sensorial, Hearing impairments, Deafness, hard of hearing",
					}),
				},
				{
					key: "sensorial_hearing_impairments_deafness_other_hearing_disability",
					label: ctx.t({
						code: "human_effects.disability.sensorial_hearing_impairments_deafness_other_hearing_disability",
						desc: "Type of disability.",
						msg: "Sensorial, Hearing impairments, Deafness, other hearing disability",
					}),
				},
				{
					key: "sensorial_other_sensory_impairments",
					label: ctx.t({
						code: "human_effects.disability.sensorial_other_sensory_impairments",
						desc: "Type of disability.",
						msg: "Sensorial, other sensory impairments",
					}),
				},
				{
					key: "psychosocial",
					label: ctx.t({
						code: "human_effects.disability.psychosocial",
						desc: "Type of disability.",
						msg: "Psychosocial",
					}),
				},
				{
					key: "intellectual_cognitive",
					label: ctx.t({
						code: "human_effects.disability.intellectual_cognitive",
						desc: "Type of disability.",
						msg: "Intellectual/ Cognitive",
					}),
				},
				{
					key: "multiple_deaf_blindness",
					label: ctx.t({
						code: "human_effects.disability.multiple_deaf_blindness",
						desc: "Type of disability.",
						msg: "Multiple, Deaf blindness",
					}),
				},
				{
					key: "multiple_other_multiple",
					label: ctx.t({
						code: "human_effects.disability.multiple_other_multiple",
						desc: "Type of disability.",
						msg: "Multiple, other multiple",
					}),
				},
				{
					key: "others",
					label: ctx.t({
						code: "human_effects.disability.others",
						desc: "Type of disability.",
						msg: "Others",
					}),
				},
			],
		},
		{
			uiName: ctx.t({
				code: "human_effects.global_poverty_line",
				msg: "Global poverty line",
			}),
			jsName: "globalPovertyLine",
			dbName: "global_poverty_line",
			uiColWidth: "thin", // 60
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "below",
					label: ctx.t({
						code: "human_effects.below",
						msg: "Below",
					}),
				},
				{
					key: "above",
					label: ctx.t({
						code: "human_effects.above",
						msg: "Above",
					}),
				},
			],
		},
		{
			uiName: ctx.t({
				code: "human_effects.national_poverty_line",
				msg: "National poverty line",
			}),
			jsName: "nationalPovertyLine",
			dbName: "national_poverty_line",
			uiColWidth: "thin", // 60
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "below",
					label: ctx.t({
						code: "human_effects.below",
						msg: "Below",
					}),
				},
				{
					key: "above",
					label: ctx.t({
						code: "human_effects.above",
						msg: "Above",
					}),
				},
			],
		},
	];
	for (const item of shared) {
		item.shared = true;
	}
	return shared;
}

export async function sharedDefs(ctx: BackendContext, tx: Tx): Promise<Def[]> {
	let hidden = await getHidden(tx);
	let shared = sharedDefsAll(ctx);
	shared = shared.filter((d) => !hidden.has(d.dbName));
	return shared;
}

async function defsCustom(tx: Tx, countryAccountsId: string): Promise<Def[]> {
	const row = await tx.query.humanDsgConfigTable.findFirst({
		where: eq(humanDsgConfigTable.countryAccountsId, countryAccountsId),
	});
	if (!row?.custom?.config) {
		return [];
	}
	return row.custom.config.map((d) => {
		return {
			uiName: d.uiName,
			jsName: d.dbName,
			dbName: d.dbName,
			uiColWidth: d.uiColWidth,
			format: "enum",
			role: "dimension",
			custom: true,
			data: d.enum,
		};
	});
}

export async function defsForTable(
	ctx: BackendContext,
	tx: Tx,
	tbl: HumanEffectsTable,
	countryAccountsId: string,
): Promise<Def[]> {
	return [
		...(await sharedDefs(ctx, tx)),
		...(await defsCustom(tx, countryAccountsId)),
		...defsForTableGlobal(ctx, tbl),
	];
}

export function defsForTableGlobal(
	ctx: BackendContext,
	tbl: HumanEffectsTable,
): Def[] {
	let res: Def[] = [];
	switch (tbl) {
		case "Deaths":
			res.push({
				uiName: ctx.t({
					code: "human_effects.deaths",
					msg: "Deaths",
				}),
				jsName: "deaths",
				dbName: "deaths",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Injured":
			res.push({
				uiName: ctx.t({
					code: "human_effects.injured",
					msg: "Injured",
				}),
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Missing":
			res.push({
				uiName: ctx.t({
					code: "human_effects.as_of",
					msg: "As of",
				}),
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin",
			});
			res.push({
				uiName: ctx.t({
					code: "human_effects.missing",
					msg: "Missing",
				}),
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Affected":
			res.push({
				uiName: ctx.t({
					code: "human_effects.directly_affected_old_desinventar",
					msg: "Directly affected (Old DesInventar)",
				}),
				jsName: "direct",
				dbName: "direct",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			res.push({
				uiName: ctx.t({
					code: "human_effects.indirectly_affected_old_desinventar",
					msg: "Indirectly affected (Old DesInventar)",
				}),
				jsName: "indirect",
				dbName: "indirect",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Displaced":
			res.push({
				uiName: ctx.t({
					code: "human_effects.assisted",
					msg: "Assisted",
				}),
				jsName: "assisted",
				dbName: "assisted",
				format: "enum",
				role: "dimension",
				data: [
					{
						key: "assisted",
						label: ctx.t({
							code: "human_effects.assisted",
							msg: "Assisted",
						}),
					},
					{
						key: "not_assisted",
						label: ctx.t({
							code: "human_effects.not_assisted",
							msg: "Not Assisted",
						}),
					},
				],
				uiColWidth: "medium",
			});
			res.push({
				uiName: ctx.t({
					code: "human_effects.timing",
					msg: "Timing",
				}),
				jsName: "timing",
				dbName: "timing",
				format: "enum",
				role: "dimension",
				data: [
					{
						key: "pre-emptive",
						label: ctx.t({
							code: "human_effects.pre_emptive",
							msg: "Pre-emptive",
						}),
					},
					{
						key: "reactive",
						label: ctx.t({
							code: "human_effects.reactive",
							msg: "Reactive",
						}),
					},
				],
				uiColWidth: "medium",
			});
			res.push({
				uiName: "Duration",
				jsName: "duration",
				dbName: "duration",
				format: "enum",
				role: "dimension",
				data: [
					{
						key: "short",
						label: ctx.t({
							code: "human_effects.short_term",
							msg: "Short Term",
						}),
					},
					{
						key: "medium_short",
						label: ctx.t({
							code: "human_effects.medium_short_term",
							msg: "Medium Short Term",
						}),
					},
					{
						key: "medium_long",
						label: ctx.t({
							code: "human_effects.medium_long_term",
							msg: "Medium Long Term",
						}),
					},
					{
						key: "long",
						label: ctx.t({
							code: "human_effects.long_term",
							msg: "Long Term",
						}),
					},
					{
						key: "permanent",
						label: ctx.t({
							code: "human_effects.permanent",
							msg: "Permanent",
						}),
					},
				],
				uiColWidth: "wide",
			});
			res.push({
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin",
			});
			res.push({
				uiName: "Displaced",
				jsName: "displaced",
				dbName: "displaced",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		default:
			throw new Error(`Unknown table: ${tbl}`);
	}
	return res;
}
