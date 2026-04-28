import { authLoaderWithPerm } from "~/utils/auth";

import {
	devExample2Create,
	devExample2UpdateById,
	devExample2IdByImportId,
	fieldsDefApi,
} from "~/backend.server/models/dev_example2";

import { createAction } from "~/backend.server/handlers/form/csv_import";

import { csvImportScreen } from "~/frontend/csv_import";

import { ViewContext } from "~/frontend/context";
import { useActionData } from "react-router";

export const loader = authLoaderWithPerm("EditData", async () => {
	return {};
});

export const action = createAction({
	fieldsDef: fieldsDefApi,
	create: devExample2Create,
	update: devExample2UpdateById,
	idByImportId: devExample2IdByImportId,
});

export default function Screen() {
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext();

	return csvImportScreen({
		ctx,
		actionData: ad,
		title: "Dev Example 2",
		apiBaseUrl: "/api/dev-example2",
		listUrl: "/examples/dev-example2",
	});
}
