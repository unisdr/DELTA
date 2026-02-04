import {
	authLoaderWithPerm,
} from "~/util/auth";

import {
	disasterEventCreate,
	disasterEventUpdate,
	disasterEventIdByImportId
} from "~/backend.server/models/event";

import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

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
	fieldsDef: async (ctx) => fieldsDefApi(ctx),
	create: disasterEventCreate,
	update: disasterEventUpdate,
	idByImportId: disasterEventIdByImportId,
})

export default function Screen() {
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext();

	return csvImportScreen({
		ctx,
		actionData: ad,

		title: "Disaster events",
		apiBaseUrl: "/api/disaster-event",
		listUrl: "/disaster-event"
	})
}



