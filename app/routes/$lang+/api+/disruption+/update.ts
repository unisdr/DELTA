import { authLoaderApi, authActionApi } from "~/util/auth";

import {
	disruptionUpdateByIdAndCountryAccountsId,
	getFieldsDefApi,
} from "~/backend.server/models/disruption";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
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

	return authActionApi(async (args) => {
		const data = await args.request.json();

		const saveRes = await jsonUpdate({
			ctx,
			data,
			fieldsDef: getFieldsDefApi(ctx),
			update: disruptionUpdateByIdAndCountryAccountsId,
			countryAccountsId,
			tableName: "disruption",
		});

		return Response.json(saveRes);
	})(args);
};
