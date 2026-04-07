import { authLoaderApi, authActionApi } from "~/utils/auth";
import { clear } from "~/backend.server/handlers/human_effects";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (actionArgs) => {
	const { request } = actionArgs;
	const apiKey = (actionArgs as any).apiKey;
	const countryAccountsId = apiKey?.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	let url = new URL(request.url);
	let recordId = url.searchParams.get("recordId") || "";
	let table = url.searchParams.get("table") || "";
	return await clear(table, recordId, countryAccountsId);
});
