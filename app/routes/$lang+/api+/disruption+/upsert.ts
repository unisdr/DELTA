import { authLoaderApi } from "~/utils/auth";

import {
	disruptionIdByImportIdAndCountryAccountsId,
	getFieldsDefApi,
} from "~/backend.server/models/disruption";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import { disruptionCreate, disruptionUpdate } from "~/backend.server/models/disruption";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunctionArgs } from "react-router";
import { SelectDisruption } from "~/drizzle/schema/disruptionTable";
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

	const data: SelectDisruption[] = await args.request.json();

	const saveRes = await jsonUpsert({
		ctx,
		data,
		fieldsDef: getFieldsDefApi(ctx),
		create: disruptionCreate,
		update: disruptionUpdate,
		idByImportIdAndCountryAccountsId: disruptionIdByImportIdAndCountryAccountsId,
		countryAccountsId: countryAccountsId,
		tableName: "disruption",
	});

	return Response.json(saveRes);
};
