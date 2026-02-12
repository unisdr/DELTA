import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/utils/auth";

import { useLoaderData } from "react-router";

import { dr } from '~/db.server';

import { MainContainer } from "~/frontend/container";

import { humanDsgConfigTable } from "~/drizzle/schema/humanDsgConfigTable";

import {
	SubmitButton,
} from "~/frontend/form";

import { Form } from "react-router";
import { HumanEffectsHidden } from "~/frontend/human_effects/defs";
import { sharedDefsAll } from "~/backend.server/models/human_effects";
import { etLocalizedStringForLang } from "~/frontend/editabletable/base";

import { LangLink } from "~/utils/link";
import { ViewContext } from "~/frontend/context";

import { getCountryAccountsIdFromSession } from "~/utils/session";
import { eq } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";


async function getConfig() {
	let row = await dr.query.humanDsgConfigTable.findFirst()
	return new Set(row?.hidden?.cols || [])
}

export const loader = authLoaderWithPerm("EditHumanEffectsCustomDsg", async (args) => {
	const ctx = new BackendContext(args);
	const config = await getConfig();
	return {
		defs: sharedDefsAll(ctx),
		config
	}
});

export const action = authActionWithPerm("EditHumanEffectsCustomDsg", async (args) => {
	const { request } = args;
	const ctx = new BackendContext(args);
	let formData = await request.formData();
	let defs = sharedDefsAll(ctx);
	let res: HumanEffectsHidden = { cols: [] }
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	for (let d of defs) {
		let v = formData.get(d.dbName) || ""
		if (typeof v !== "string") {
			throw "Wrong argument"
		}
		if (v != "on") {
			res.cols.push(d.dbName)
		}
	}
	await dr.transaction(async (tx) => {
		const row = await tx.query.humanDsgConfigTable.findFirst()
		if (!row) {
			await tx.insert(humanDsgConfigTable)
				.values({
					hidden: res,
					countryAccountsId: countryAccountsId
				})
		} else {
			await tx.update(humanDsgConfigTable)
				.set({ hidden: res })
				.where(eq(humanDsgConfigTable.countryAccountsId, countryAccountsId))
		}
	});
	return { ok: true }
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>()
	const ctx = new ViewContext();
	const lang = "default"

	return (
		<MainContainer
			title={ctx.t({ "code": "human_effects.human_effects_configure_disaggregations", "msg": "Human effects: Configure disaggregations" })}
		>
			<LangLink lang={ctx.lang} to="/settings/human-effects-dsg/custom">
				{ctx.t({
					"code": "human_effects.configure_custom_disaggregations",
					"msg": "Configure custom disaggregations"
				})}
			</LangLink>
			<Form method="post">
				<h3>{ctx.t({
					"code": "human_effects.disaggregation_columns",
					"msg": "Disaggregation columns"
				})}</h3>
				{ld.defs.map((d, i) => {
					return <label key={i}>
						<input type="checkbox" name={d.dbName} defaultChecked={!((ld.config instanceof Set) && ld.config.has(d.dbName))} />&nbsp;
						{etLocalizedStringForLang(d.uiName, lang)}
					</label>
				})}
				<SubmitButton className="mg-button mg-button-primary" label={ctx.t({
					"code": "human_effects.update_config",
					"msg": "Update config"
				})} />
			</Form>


		</MainContainer>
	)
}

