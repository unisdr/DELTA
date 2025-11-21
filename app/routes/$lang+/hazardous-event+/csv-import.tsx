import {
	authLoaderWithPerm
} from "~/util/auth";

import {
	hazardousEventUpdate,
	hazardousEventIdByImportId,
	hazardousEventCreate,
} from "~/backend.server/models/event";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

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
	create: hazardousEventCreate,
	update: hazardousEventUpdate,
	idByImportId: hazardousEventIdByImportId,
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext(ld);

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Hazardous Events",
		apiBaseUrl: "/api/hazardous-event",
		listUrl: "/hazardous-event"
	})
}


