import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	getFieldsDefApi,
} from "~/backend.server/models/disruption"

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api"
import { disruptionCreate } from "~/backend.server/models/disruption"
import { apiAuth } from "~/backend.server/models/api_key";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()

	const apiKey = await apiAuth(args.request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const saveRes = await jsonCreate({
		data,
		fieldsDef: getFieldsDefApi(),
		create: disruptionCreate,
		countryAccountsId: countryAccountsId,
		tableName: "disruption",
	})

	return Response.json(saveRes)
})

