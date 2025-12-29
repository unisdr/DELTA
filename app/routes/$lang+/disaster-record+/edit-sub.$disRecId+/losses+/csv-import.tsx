import { authLoaderWithPerm } from "~/util/auth";

import {
	lossesCreate,
	lossesUpdate,
	lossesIdByImportId,
	createFieldsDefApi,
} from "~/backend.server/models/losses";

import { createAction } from "~/backend.server/handlers/form/csv_import";

import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { getCountrySettingsFromSession } from "~/util/session";

import {
	csvImportScreen
} from "~/frontend/csv_import"

import { ViewContext } from "~/frontend/context";
import { useActionData } from "@remix-run/react";

export const loader = authLoaderWithPerm("EditData", async () => {
	return {
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
			return createFieldsDefApi(currencies);
		},
		create: lossesCreate,
		update: lossesUpdate,
		idByImportId: lossesIdByImportId,
	});
};


export default function Screen() {
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext();

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Losses",
		apiBaseUrl: "/api/losses",
		listUrl: "/losses",
	})
}

