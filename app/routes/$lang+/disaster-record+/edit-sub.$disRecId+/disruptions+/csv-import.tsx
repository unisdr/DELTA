import {
	authLoaderWithPerm
} from "~/util/auth"

import {
	disruptionCreate,
	disruptionUpdate,
	disruptionIdByImportId,
	getFieldsDefApi
} from "~/backend.server/models/disruption"

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

import { ViewContext } from "~/frontend/context";
import { useActionData } from "react-router";

import {
	csvImportScreen
} from "~/frontend/csv_import"

export const loader = authLoaderWithPerm("EditData", async () => {
	return {
	}
});

export const action = createAction({
	fieldsDef: async (ctx) => getFieldsDefApi(ctx),
	create: disruptionCreate,
	update: disruptionUpdate,
	idByImportId: disruptionIdByImportId,
})

export default function Screen() {
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext();

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Disruption",
		apiBaseUrl: "/api/disruption",
		listUrl: "/disruptions"
	})
}


