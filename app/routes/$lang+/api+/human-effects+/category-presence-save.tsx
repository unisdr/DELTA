import { authLoaderApi } from "~/utils/auth";
import { HumanEffectsTableFromString, HumanEffectsTable } from "~/frontend/human_effects/defs";
import { dr } from "~/db.server"

import {
	authActionApi
} from "~/utils/auth";
import { defsForTable, categoryPresenceSet } from "~/backend.server/models/human_effects";
import { apiAuth } from "~/backend.server/models/api_key";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

interface Req {
	table: string
	data: Record<string, boolean>
}

export const action = authActionApi(async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request } = actionArgs
	let url = new URL(request.url)
	let recordId = url.searchParams.get("recordId") || ""

	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}


	let d
	try {
		d = await request.json() as Req
	} catch {
		return Response.json({ ok: false, error: "Invalid JSON" }, {
			status: 400
		})
	}
	let tblId: HumanEffectsTable | null = null
	try {
		tblId = HumanEffectsTableFromString(d.table)
	} catch (e) {
		return Response.json({ ok: false, error: String(e) })
	}
	let defs = await defsForTable(ctx, dr, tblId, countryAccountsId)
	await categoryPresenceSet(dr, recordId, tblId, defs, d.data)
	return { ok: true }
})

