import { authLoaderApi } from "~/utils/auth";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	fieldsDefApi,
	nonecoLossesCreate,
	nonecoLossesUpdate,
	nonecoLossesIdByImportIdAndCountryAccountsId,
} from "~/backend.server/models/noneco_losses";
import { SelectNonecoLosses } from "~/drizzle/schema/nonecoLossesTable";
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

	const data: SelectNonecoLosses[] = await args.request.json();

	const saveRes = await jsonUpsert({
		ctx,
		data,
		fieldsDef: fieldsDefApi,
		create: nonecoLossesCreate,
		update: nonecoLossesUpdate,
		idByImportIdAndCountryAccountsId: nonecoLossesIdByImportIdAndCountryAccountsId,
		countryAccountsId,
	});

	return Response.json(saveRes);
};
