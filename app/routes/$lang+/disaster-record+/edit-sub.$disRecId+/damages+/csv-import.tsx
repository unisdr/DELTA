import { authLoaderWithPerm } from "~/util/auth";

import {
	damagesCreate,
	damagesUpdate,
	damagesIdByImportId,
	fieldsDefApi,
} from "~/backend.server/models/damages";

import { createAction } from "~/backend.server/handlers/form/csv_import";

import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { getCountrySettingsFromSession } from "~/util/session";

import {
	csvImportScreen
} from "~/frontend/csv_import"


import { ViewContext } from "~/frontend/context";
import { useActionData, useLoaderData } from "@remix-run/react";

import { getCommonData } from "~/backend.server/handlers/commondata";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	return {
		common: await getCommonData(loaderArgs),
	}
});

export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;
	return createAction({
		fieldsDef: async () => {
			const settings = await getCountrySettingsFromSession(request);
			const currencies = settings.currencyCode
				? [settings.currencyCode]
				: ["USD"];
			return await fieldsDefApi(currencies);
		},
		create: damagesCreate,
		update: damagesUpdate,
		idByImportId: damagesIdByImportId,
	})(actionArgs);
};

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext(ld);

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Damages",
		apiBaseUrl: "/api/damages",
		listUrl: "/damages",
	})
}
