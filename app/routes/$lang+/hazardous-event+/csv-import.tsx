import {
	authLoaderWithPerm
} from "~/utils/auth";

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
import { useActionData } from "react-router";



export const loader = authLoaderWithPerm("EditData", async () => {
	return {
	}
});

export const action = createAction({
	fieldsDef: async (ctx) => fieldsDefApi(ctx),
	create: hazardousEventCreate,
	update: hazardousEventUpdate,
	idByImportId: hazardousEventIdByImportId,
})

export default function Screen() {
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext();

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Hazardous events",
		apiBaseUrl: "/api/hazardous-event",
		listUrl: "/hazardous-event"
	})
}


