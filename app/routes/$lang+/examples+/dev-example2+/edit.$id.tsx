import {
	devExample2ById,
	devExample2ByIdTx,
	devExample2Create,
	devExample2UpdateById,
	fieldsDef,
} from "~/backend.server/models/dev_example2";

import { DevExample2Form, route, TOTAL_STEPS } from "~/frontend/dev_example2";

import { formScreen } from "~/frontend/form";

import { useLoaderData, useSearchParams } from "react-router";
import { ActionFunction, ActionFunctionArgs } from "react-router";
import { getTableName } from "drizzle-orm";
import {
	createOrUpdateAction,
	loaderItemAndUser,
} from "~/backend.server/handlers/form/form";
import { devExample2Table } from "~/drizzle/schema/devExample2Table";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { ViewContext } from "~/frontend/context";
import { authLoaderWithPerm } from "~/utils/auth";

function getFieldsForStep(allFields: any[], step: number) {
	return allFields.filter((f) => (f.page || 1) === step);
}

export const action: ActionFunction = async (
	loaderArgs: ActionFunctionArgs,
) => {
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const url = new URL(request.url);
	const step = parseInt(url.searchParams.get("step") || "1", 10);
	const saveAction = url.searchParams.get("_saveAction") || "draft";
	const allFieldsDef = await fieldsDef();
	const stepFieldsDef = getFieldsForStep(allFieldsDef, step);

	const nextStep =
		saveAction === "next" && step < TOTAL_STEPS ? step + 1 : step;

	return createOrUpdateAction({
		fieldsDef: stepFieldsDef,
		create: devExample2Create,
		update: devExample2UpdateById,
		getById: devExample2ByIdTx,
		redirectTo: (id) => `${route}/edit/${id}?step=${nextStep}`,
		tableName: getTableName(devExample2Table),
		action: (isCreate) =>
			isCreate ? "Create dev-example2" : "Update dev-example2",
		countryAccountsId,
	})(loaderArgs);
};

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("No instance selected", { status: 401 });
	}

	let res = await loaderItemAndUser({
		loaderArgs,
		getById: devExample2ById,
	});

	const item = res.item;
	if (item && item.countryAccountsId !== countryAccountsId) {
		throw new Response("unauthorized", { status: 401 });
	}

	return {
		fieldsDef: await fieldsDef(),
		...res,
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const [searchParams, setSearchParams] = useSearchParams();

	const currentStep = parseInt(searchParams.get("step") || "1", 10);
	const activeStep = Math.max(1, Math.min(currentStep, TOTAL_STEPS));

	const fieldsFiltered = getFieldsForStep(ld.fieldsDef, activeStep);

	let fieldsInitial = ld.item ? { ...ld.item } : {};

	return formScreen({
		ctx,
		extraData: {
			fieldDef: fieldsFiltered,
			activeStep,
			totalSteps: TOTAL_STEPS,
			onStepChange: (step: number) => {
				setSearchParams({ step: String(step) });
			},
		},
		fieldsInitial,
		form: DevExample2Form,
		edit: !!ld.item,
		id: ld.item?.id || undefined,
	});
}
