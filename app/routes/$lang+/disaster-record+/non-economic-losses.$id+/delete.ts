import { authLoaderWithPerm } from "~/utils/auth";

import {
	nonecoLossesById,
	nonecoLossesDeleteById,
} from "~/backend.server/models/noneco_losses";

import { redirectLangFromRoute } from "~/utils/url.backend";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const { params } = actionArgs;
	const req = actionArgs.request;

	// Parse the request URL
	const parsedUrl = new URL(req.url);

	// Extract query string parameters
	const queryParams = parsedUrl.searchParams;
	const xId = queryParams.get("id") || "";

	// Get country accounts ID from session
	const countryAccountsId = await getCountryAccountsIdFromSession(req);

	if (!countryAccountsId) {
		throw redirectLangFromRoute(actionArgs, "/user/select-instance");
	}

	const record = await nonecoLossesById(xId, countryAccountsId);
	if (record) {
		try {
			// Delete noneco losses by id
			await nonecoLossesDeleteById(xId).catch(console.error);

			return redirectLangFromRoute(
				actionArgs,
				"/disaster-record/edit/" + params.id,
			);
		} catch (e) {
			console.log(e);
			throw e;
		}
	} else {
		return Response.json({}, { status: 404 });
	}
});
