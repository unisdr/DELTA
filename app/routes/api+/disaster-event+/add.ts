import { authLoaderApi } from "~/utils/auth";

import { fieldsDefApi } from "~/frontend/events/disastereventform";

import { jsonCreate } from "~/backend.server/handlers/form/form_api";
import { disasterEventCreate } from "~/backend.server/models/event";
import { ActionFunction, ActionFunctionArgs } from "react-router";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectDisasterEvent } from "~/drizzle/schema/disasterEventTable";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
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

	let data: SelectDisasterEvent[] = await request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi(),
		create: disasterEventCreate,
		countryAccountsId: countryAccountsId,
	});

	return Response.json(saveRes);
};
