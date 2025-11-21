import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import { useLoaderData } from "@remix-run/react";

import { dr } from '~/db.server';

import { MainContainer } from "~/frontend/container";

import { humanDsgConfigTable } from "~/drizzle/schema";

import {
	SubmitButton,
} from "~/frontend/form";

import { Form } from "@remix-run/react";
import { HumanEffectsHidden } from "~/frontend/human_effects/defs";
import { sharedDefsAll } from "~/backend.server/models/human_effects";
import { etLocalizedStringForLang } from "~/frontend/editabletable/base";

import { LangLink } from "~/util/link";
import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";


async function getConfig() {
	let row = await dr.query.humanDsgConfigTable.findFirst()
	return new Set(row?.hidden?.cols || [])
}

export const loader = authLoaderWithPerm("EditHumanEffectsCustomDsg", async (loaderArgs) => {
	let config = await getConfig()
	return {
		common: await getCommonData(loaderArgs),	
		defs: sharedDefsAll(),
		config
	}
});

export const action = authActionWithPerm("EditHumanEffectsCustomDsg", async ({ request }) => {
	let formData = await request.formData()
	let defs = sharedDefsAll()
	let res: HumanEffectsHidden = { cols: [] }
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
				.values({ hidden: res })
		} else {
			await tx.update(humanDsgConfigTable)
				.set({ hidden: res })
		}
	});
	return { ok: true }
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>()
	const ctx = new ViewContext(ld);
	const lang = "default"

	return (
		<MainContainer
			title="Human Effects Configure Disaggregations"
		>
			<LangLink lang={ctx.lang} to="/settings/human-effects-dsg/custom">Configure Custom Disaggregations</LangLink>

			<Form method="post">
				<h3>Disaggregation columns</h3>
				{ld.defs.map((d, i) => {
					return <label key={i}>
						<input type="checkbox" name={d.dbName} defaultChecked={!((ld.config instanceof Set) && ld.config.has(d.dbName))} />&nbsp;
						{etLocalizedStringForLang(d.uiName, lang)}
					</label>
				})}
				<SubmitButton className="mg-button mg-button-primary" label="Update config" />
			</Form>


		</MainContainer>
	)
}

