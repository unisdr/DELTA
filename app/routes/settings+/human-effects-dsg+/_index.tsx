import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";

import { useLoaderData, useActionData } from "react-router";

import { dr } from "~/db.server";

import { MainContainer } from "~/frontend/container";

import { humanDsgConfigTable } from "~/drizzle/schema/humanDsgConfigTable";

import { SubmitButton } from "~/frontend/form";

import { Form } from "react-router";
import { HumanEffectsHidden } from "~/frontend/human_effects/defs";
import { sharedDefsAll } from "~/backend.server/models/human_effects";
import { etLocalizedStringForLang } from "~/frontend/editabletable/base";

import { LangLink } from "~/utils/link";


import { getCountryAccountsIdFromSession } from "~/utils/session";
import { eq } from "drizzle-orm";

import { getUsedBuiltinColumns } from "~/backend.server/models/human_effects";
import Messages from "~/components/Messages";

async function getConfig() {
	let row = await dr.query.humanDsgConfigTable.findFirst();
	return new Set(row?.hidden?.cols || []);
}

export const loader = authLoaderWithPerm(
	"EditHumanEffectsCustomDsg",
	async (args) => {

		const countryAccountsId = await getCountryAccountsIdFromSession(
			args.request,
		);
		const config = await getConfig();
		const usedColumns = await getUsedBuiltinColumns(dr, countryAccountsId);
		return {
			defs: sharedDefsAll(),
			config,
			usedColumns: Array.from(usedColumns),
		};
	},
);

export const action = authActionWithPerm(
	"EditHumanEffectsCustomDsg",
	async (args) => {
		const { request } = args;

		let formData = await request.formData();
		let defs = sharedDefsAll();
		let res: HumanEffectsHidden = { cols: [] };
		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const usedColumns = await getUsedBuiltinColumns(dr, countryAccountsId);

		for (let d of defs) {
			let v = formData.get(d.dbName) || "";
			if (typeof v !== "string") {
				throw "Wrong argument";
			}
			if (v != "on") {
				if (usedColumns.has(d.dbName)) {
					return {
						ok: false,
						error: "column_has_data",
					};
				}
				res.cols.push(d.dbName);
			}
		}

		await dr.transaction(async (tx) => {
			const row = await tx.query.humanDsgConfigTable.findFirst();
			if (!row) {
				await tx.insert(humanDsgConfigTable).values({
					hidden: res,
					countryAccountsId: countryAccountsId,
				});
			} else {
				await tx
					.update(humanDsgConfigTable)
					.set({ hidden: res })
					.where(eq(humanDsgConfigTable.countryAccountsId, countryAccountsId));
			}
		});
		return { ok: true };
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const humanEffectsLang = "default";

	return (
		<MainContainer
			title={"Human effects: Configure built-in disaggregations"}
		>
			<LangLink lang="en" to="/settings/human-effects-dsg/custom">
				{"Configure custom disaggregations"}
			</LangLink>
			{actionData && !actionData.ok && (
				<Messages
					header={"Errors"}
					messages={[actionData.error || "Server error"]}
				/>
			)}
			<Form method="post">
				<h3>
					{"Disaggregation columns"}
				</h3>
				{ld.defs.map((d, i) => {
					const isUsed = ld.usedColumns.includes(d.dbName);
					const isEnabled = !ld.config.has(d.dbName);
					return (
						<div key={i}>
							<label>
								<input
									type="checkbox"
									name={d.dbName}
									defaultChecked={isEnabled}
									disabled={isUsed}
								/>
								&nbsp;
								{etLocalizedStringForLang(d.uiName, humanEffectsLang)}
								{isUsed && (
									<span style={{ color: "gray" }}>
										&nbsp;(
										{"in use"})
									</span>
								)}
							</label>
							{isUsed && isEnabled && (
								<input type="hidden" name={d.dbName} value="on" />
							)}
						</div>
					);
				})}
				<SubmitButton
					className="mg-button mg-button-primary"
					label={"Update config"}
				/>
			</Form>
		</MainContainer>
	);
}
