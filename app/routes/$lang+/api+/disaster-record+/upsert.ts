import { authLoaderApi } from "~/util/auth";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	DisasterRecordsFields,
	disasterRecordsIdByImportIdAndCountryAccountsId,
} from "~/backend.server/models/disaster_record";

import { fieldsDefApi } from "~/frontend/disaster-record/form";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { SelectDisasterRecords } from "~/drizzle/schema";
import { FormInputDef } from "~/frontend/form";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
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


	let data: SelectDisasterRecords[] = await args.request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));
	let fieldsDef: FormInputDef<DisasterRecordsFields>[] = [
		...fieldsDefApi(ctx),
		{ key: "countryAccountsId", label: "", type: "text" },
	];
	const saveRes = await jsonUpsert({
		ctx,
		data,
		fieldsDef: fieldsDef,
		create: disasterRecordsCreate,
		update: async (_ctx: BackendContext, tx: any, id: string, fields: any) => {
			return disasterRecordsUpdate(ctx, tx, id, fields, countryAccountsId);
		},
		idByImportIdAndCountryAccountsId: disasterRecordsIdByImportIdAndCountryAccountsId,
		countryAccountsId,
	});

	return Response.json(saveRes);
};

