import { authLoaderApi } from "~/utils/auth";

import { fieldsDefApi } from "~/frontend/events/hazardeventform";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";
import {
	hazardousEventUpdate,
	hazardousEventCreate,
	HazardousEventFields,
	hazardousEventIdByImportIdAndCountryAccountsId,
} from "~/backend.server/models/event";
import { ActionFunction, ActionFunctionArgs } from "react-router";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectHazardousEvent } from "~/drizzle/schema/hazardousEventTable";
import { FormInputDef } from "~/frontend/form";

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

	let data: SelectHazardousEvent[] = await args.request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));
	let fieldsDef: FormInputDef<HazardousEventFields>[] = [
		...fieldsDefApi(),
		{ key: "countryAccountsId", label: "", type: "text" },
	];
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDef,
		create: (tx, data) => hazardousEventCreate(tx, data),
		update: (tx, id, data) => hazardousEventUpdate(tx, id, data),
		idByImportIdAndCountryAccountsId:
			hazardousEventIdByImportIdAndCountryAccountsId,
		countryAccountsId,
	});

	return Response.json(saveRes);
};
