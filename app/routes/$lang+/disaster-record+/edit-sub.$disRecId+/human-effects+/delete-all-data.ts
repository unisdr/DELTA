// Deletes all human effects data (all tables) for a disaster record.
// See _docs/human-direct-effects.md for overview.
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { deleteAllData } from "~/backend.server/handlers/human_effects";
import { BackendContext } from "~/backend.server/context";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST";
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { params, request } = actionArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	let recordId = params.disRecId || "";
	return await deleteAllData(ctx, recordId, countryAccountsId);
});
