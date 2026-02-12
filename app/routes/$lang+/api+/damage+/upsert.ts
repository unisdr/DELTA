import { authLoaderApi } from "~/utils/auth";

import {
	DamagesFields,
	damagesIdByImportIdAndCountryAccountsId,
	fieldsDefApi,
} from "~/backend.server/models/damages";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import { damagesCreate, damagesUpdate } from "~/backend.server/models/damages";
import { ActionFunctionArgs } from "react-router";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectDamages } from "~/drizzle/schema/damagesTable";
import { FormInputDef } from "~/frontend/form";
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

	let data: SelectDamages[] = await args.request.json();

	const settings = await getInstanceSystemSettingsByCountryAccountId(countryAccountsId);
	let currencies: string[] = ["USD"];
	if (settings) {
		currencies = [settings.currencyCode];
	}
	let fieldsDef: FormInputDef<DamagesFields>[] = [...(await fieldsDefApi(ctx, currencies))];
	const saveRes = await jsonUpsert({
		ctx,
		data,
		fieldsDef,
		create: damagesCreate,
		update: damagesUpdate,
		idByImportIdAndCountryAccountsId: damagesIdByImportIdAndCountryAccountsId,
		countryAccountsId,
		tableName: "damages",
	});

	return Response.json(saveRes);
};
