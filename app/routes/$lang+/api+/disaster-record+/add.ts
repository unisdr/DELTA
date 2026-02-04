import { authLoaderApi } from "~/util/auth";

import { jsonCreate } from "~/backend.server/handlers/form/form_api";

import { fieldsDefApi } from "~/frontend/disaster-record/form";

import { disasterRecordsCreate } from "~/backend.server/models/disaster_record";
import { ActionFunction, ActionFunctionArgs } from "react-router";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectDisasterRecords } from "~/drizzle/schema";
import { BackendContext } from "~/backend.server/context";

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
	const ctx = new BackendContext(args);

	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	let data: SelectDisasterRecords[] = await request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));

	const saveRes = await jsonCreate({
		ctx,
		data,
		fieldsDef: fieldsDefApi(ctx),
		create: disasterRecordsCreate,
		countryAccountsId: countryAccountsId,
	});

	return Response.json(saveRes);
};
