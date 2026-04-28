import { ActionFunction, ActionFunctionArgs } from "react-router";
import { getTableName } from "drizzle-orm";
import { createDeleteActionWithCountryAccounts } from "~/backend.server/handlers/form/form";
import {
	devExample2ById,
	devExample2DeleteByIdAndCountryAccounts,
} from "~/backend.server/models/dev_example2";
import { devExample2Table } from "~/drizzle/schema/devExample2Table";

import { route } from "~/frontend/dev_example2";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createDeleteActionWithCountryAccounts({
		baseRoute: route,
		delete: devExample2DeleteByIdAndCountryAccounts,
		tableName: getTableName(devExample2Table),
		getById: devExample2ById,
		countryAccountsId: countryAccountsId,
	})(args);
};
