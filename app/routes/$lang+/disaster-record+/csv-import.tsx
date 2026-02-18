import { authLoaderWithPerm } from "~/utils/auth";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId,
} from "~/backend.server/models/disaster_record";

import { fieldsDefApi } from "~/frontend/disaster-record/form";

import { createAction } from "~/backend.server/handlers/form/csv_import";

import { csvImportScreen } from "~/frontend/csv_import";

import { ViewContext } from "~/frontend/context";
import { useActionData } from "react-router";

export const loader = authLoaderWithPerm("EditData", async () => {
	return {};
});

export const action = createAction({
	fieldsDef: async (ctx) => fieldsDefApi(ctx),
	create: disasterRecordsCreate,
	update: disasterRecordsUpdate,
	idByImportId: disasterRecordsIdByImportId,
});

export default function Screen() {
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext();

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Disaster records",
		apiBaseUrl: "/api/disaster-record",
		listUrl: "/disaster-record",
	});
}
