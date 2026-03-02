import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { saveHumanEffectsData } from "~/backend.server/handlers/human_effects";
import { ActionFunction, ActionFunctionArgs } from "react-router";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST";
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return authActionWithPerm("EditData", async (actionArgs) => {
		const ctx = new BackendContext(actionArgs);
		const { params } = actionArgs;
		let req = actionArgs.request;
		let recordId = params.disRecId || "";
		return await saveHumanEffectsData(ctx, req, recordId, countryAccountsId);
	})(args);
};
