import { authLoaderWithPerm } from "~/util/auth";

import { loadData } from "~/backend.server/handlers/human_effects";
import { stringifyCSV } from "~/util/csv";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { BackendContext } from "~/backend.server/context";

export const loader = async (args: LoaderFunctionArgs) => {
	const ctx = new BackendContext(args);
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return authLoaderWithPerm("EditData", async (actionArgs) => {
		const { params, request } = actionArgs;
		let recordId = params.disRecId;
		let url = new URL(request.url);
		let tblStr = url.searchParams.get("table") || "";
		let res = await loadData(ctx, recordId, tblStr, countryAccountsId);
		let all = [res.defs.map((d) => d.jsName), ...res.data.map((row) => row)];
		let csv = await stringifyCSV(all);
		return new Response(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${res.tblId}.csv"`,
			},
		});
	})(args);
};
