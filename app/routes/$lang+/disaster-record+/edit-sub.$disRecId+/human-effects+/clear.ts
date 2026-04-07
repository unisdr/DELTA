import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { clear } from "~/backend.server/handlers/human_effects";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST";
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { params, request } = actionArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId){
		throw new Response("Unauthorized", { status: 401 });
	}
	let url = new URL(request.url);
	let recordId = params.disRecId || "";
	let table = url.searchParams.get("table") || "";
	return await clear(table, recordId, countryAccountsId);
});
