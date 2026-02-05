import { authLoaderWithPerm } from "~/utils/auth";

import {
	lossesCreate,
	lossesUpdate,
	lossesIdByImportId,
	createFieldsDefApi,
} from "~/backend.server/models/losses";

import { createAction } from "~/backend.server/handlers/form/csv_import";

import { ActionFunctionArgs } from "react-router";
import { getCountrySettingsFromSession } from "~/utils/session";

import {
	csvImportScreen
} from "~/frontend/csv_import"

import { ViewContext } from "~/frontend/context";
import { useActionData } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("EditData", async () => {
	return {
	}
});


export const action = async (actionArgs: ActionFunctionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request } = actionArgs;
	return createAction({
		fieldsDef: async () => {
			const settings = await getCountrySettingsFromSession(request);
			const currencies = settings.currencyCode
				? [settings.currencyCode]
				: ["USD"];
			return createFieldsDefApi(ctx, currencies);
		},
		create: lossesCreate,
		update: lossesUpdate,
		idByImportId: lossesIdByImportId,
	});
};

type ActionData = Awaited<ReturnType<typeof action>>;
export default function Screen() {
	const ad = useActionData<ActionData>();
	const ctx = new ViewContext();

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Losses",
		apiBaseUrl: "/api/losses",
		listUrl: "/losses",
	})
}

