import { authActionApi, authLoaderApi } from "~/utils/auth";

import {
	createFieldsDef,
	lossesUpdateByIdAndCountryAccountsId,
} from "~/backend.server/models/losses";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = async (args: ActionFunctionArgs) => {
	const ctx = new BackendContext(args);
	const { request } = args;
	if (request.method !== "POST") {
		throw new Response("Method Not Allowed: Only POST requests are supported", {
			status: 405,
		});
	}

	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const settings =
		await getInstanceSystemSettingsByCountryAccountId(countryAccountsId);
	if (!settings) {
		throw new Response("No settings found for country account", {
			status: 501,
		});
	}
	const currencies = [settings.currencyCode];

	return authActionApi(async (args) => {
		let data = await args.request.json();

		const saveRes = await jsonUpdate({
			ctx,
			data,
			fieldsDef: createFieldsDef(ctx, currencies),
			update: lossesUpdateByIdAndCountryAccountsId,
			countryAccountsId,
			tableName: "losses",
		});

		return Response.json(saveRes);
	})(args);
};
