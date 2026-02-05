import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";
import { Table } from "~/frontend/editabletable/view";
import { validateTotalGroup } from "~/frontend/editabletable/data";
import { useLoaderData } from "react-router";
import { getHumanEffectTableDefs, HumanEffectsTableFromString } from "~/frontend/human_effects/defs";
import { Form, useSubmit, useFetcher } from "react-router";
import { loadData } from "~/backend.server/handlers/human_effects"
import {
	categoryPresenceSet,
	defsForTable
} from '~/backend.server/models/human_effects'
import { dr } from "~/db.server";
import { notifyError } from "~/frontend/utils/notifications";
import { useEffect } from "react"
import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/util/link";
import { disasterRecordsById } from "~/backend.server/models/disaster_record";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("EditData", async (args) => {
	const ctx = new BackendContext(args);
	const { request, params } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	let recordId = params.disRecId || "";
	let url = new URL(request.url);
	let tblStr = url.searchParams.get("tbl") || "";

	// Tenant check for disaster record
	const record = await disasterRecordsById(recordId);

	if (!record || record.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return {

		...(await loadData(ctx, recordId, tblStr, countryAccountsId)),
	};
});

export const action = authLoaderWithPerm("EditData", async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	let { params, request } = actionArgs;
	let recordId = params.disRecId;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!recordId) {
		throw new Error("no record id");
	}
	let formData = await request.formData();
	let tblIdStr = String(formData.get("tblId"));
	let tblId = HumanEffectsTableFromString(tblIdStr);

	let data: Record<string, boolean> = {};
	for (let [k, v] of formData.entries()) {
		if (k == "tblId") {
			continue;
		}
		if (v == "1") {
			data[k] = true;
		} else if (v == "0") {
			data[k] = false;
		}
	}
	let defs = await defsForTable(ctx, dr, tblId, countryAccountsId)
	await categoryPresenceSet(dr, recordId, tblId, defs, data)
	return null
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	const fetcher = useFetcher<typeof loader>();
	const data = fetcher.data || ld;

	useEffect(() => {
		const vtg = validateTotalGroup(data.totalGroupFlags, data.defs)
		if (vtg.error) {
			notifyError(vtg.error.message)
		}
	}, [data.totalGroupFlags, data.defs])

	let submit = useSubmit()

	return (
		<MainContainer title={ctx.t({ "code": "human_effects", "msg": "Human effects" })}>
			<LangLink lang={ctx.lang} to={"/disaster-record/edit/" + ld.recordId}>
				{ctx.t({ "code": "common.back_to_disaster_record", "msg": "Back to disaster record" })}
			</LangLink>
			<p>{data.tbl.label}</p>
			<Form>
				<select
					name="tbl"
					value={data.tblId}
					onChange={e => {
						submit({ tbl: e.target.value }, {
							replace: true
						})
					}}
				>
					{getHumanEffectTableDefs(ctx).map((def) => (
						<option key={def.id} value={def.id}>
							{def.label}
						</option>
					))}
				</select>
			</Form>
			<Table
				ctx={ctx}
				recordId={data.recordId}
				table={data.tblId}
				initialIds={data.ids}
				initialData={data.data}
				initialTotalGroup={data.totalGroupFlags}
				defs={data.defs}
				categoryPresence={data.categoryPresence}
			/>
		</MainContainer>
	);
}
