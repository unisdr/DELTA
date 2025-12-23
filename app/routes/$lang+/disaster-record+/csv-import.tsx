import {
	authLoaderWithPerm,
} from "~/util/auth";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId
} from "~/backend.server/models/disaster_record";

import {
	fieldsDefApi,
} from "~/frontend/disaster-record/form";

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
	fieldsDef: async (ctx) => fieldsDefApi(ctx),
	create: disasterRecordsCreate,
	update: disasterRecordsUpdate,
	idByImportId: disasterRecordsIdByImportId,
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext(ld);

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Disaster records",
		apiBaseUrl: "/api/disaster-record",
		listUrl: "/disaster-record"

	})
}

