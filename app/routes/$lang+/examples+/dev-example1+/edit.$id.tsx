import {
	devExample1ById,
	devExample1ByIdTx,
	devExample1Create,
	devExample1UpdateById,
	fieldsDef,
} from "~/backend.server/models/dev_example1";

import { DevExample1Form, route } from "~/frontend/dev_example1";

import { formScreen } from "~/frontend/form";

import { useLoaderData } from "react-router";
import { ActionFunction, ActionFunctionArgs } from "react-router";
import { getTableName } from "drizzle-orm";
import {
	createOrUpdateAction,
	loaderItemAndUser,
} from "~/backend.server/handlers/form/form";
import { devExample1Table } from "~/drizzle/schema";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { ViewContext } from "~/frontend/context";
import { authLoaderWithPerm } from "~/util/auth";

export const action: ActionFunction = async (
	loaderArgs: ActionFunctionArgs
) => {
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createOrUpdateAction({
		fieldsDef,
		create: devExample1Create,
		update: devExample1UpdateById,
		getById: devExample1ByIdTx,
		redirectTo: (id) => `${route}/${id}`,
		tableName: getTableName(devExample1Table),
		action: (isCreate) =>
			isCreate ? "Create dev-example1" : "Update dev-example1",
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
		getById: devExample1ById,
	})

	const item = res.item;
	if (item && item.countryAccountsId !== countryAccountsId) {
		throw new Response("unauthorized", { status: 401 });
	}

	return {
		fieldsDef: await fieldsDef(),
		...res
	}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	let fieldsInitial = ld.item ? { ...ld.item } : {};

	return formScreen({
		ctx,
		extraData: {
			fieldDef: ld.fieldsDef,
		},
		fieldsInitial,
		form: DevExample1Form,
		edit: !!ld.item,
		id: ld.item?.id || undefined,
	});
}
