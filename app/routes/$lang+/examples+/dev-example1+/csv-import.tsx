import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	devExample1Create,
	devExample1UpdateById,
	devExample1IdByImportId,
	fieldsDefApi
} from "~/backend.server/models/dev_example1";

import {
	createAction,
} from "~/backend.server/handlers/form/csv_import"

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

export const action = createAction({
	fieldsDef: fieldsDefApi,
	create: devExample1Create,
	update: devExample1UpdateById,
	idByImportId: devExample1IdByImportId,
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext(ld);

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Dev Example 1",
		apiBaseUrl: "/api/dev-example1",
		listUrl: "/examples/dev-example1"
	})
}

