import { authLoaderWithPerm } from "~/utils/auth";

import {
	damagesCreate,
	damagesUpdate,
	damagesIdByImportId,
	fieldsDefApi,
} from "~/backend.server/models/damages";

import { createAction } from "~/backend.server/handlers/form/csv_import";

import { ActionFunctionArgs } from "react-router";
import { getCountrySettingsFromSession } from "~/utils/session";

import { csvImportScreen } from "~/frontend/csv_import";


import { useActionData } from "react-router";


export const loader = authLoaderWithPerm("EditData", async () => {
	return {};
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
	const ad = useActionData<typeof action>();


	return csvImportScreen({
		actionData: ad,
		title: "Damages",
		apiBaseUrl: "/api/damages",
		listUrl: "/damages",
	});
}
