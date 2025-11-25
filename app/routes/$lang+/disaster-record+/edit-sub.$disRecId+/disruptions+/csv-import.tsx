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
import { useActionData, useLoaderData } from "@remix-run/react";

import { getCommonData } from "~/backend.server/handlers/commondata";

import {
	csvImportScreen
} from "~/frontend/csv_import"

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	return {
		common: await getCommonData(loaderArgs),
	}
});

export const action = createAction({
	fieldsDef: async (_ctx) => getFieldsDefApi(),
	create: disruptionCreate,
	update: disruptionUpdate,
	idByImportId: disruptionIdByImportId,
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext(ld);

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Disruption",
		apiBaseUrl: "/api/disruption",
		listUrl: "/disruptions"
	})
}


