import { ActionFunction } from "react-router";
import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form/form";
import { assetById, assetDeleteById } from "~/backend.server/models/asset";
import { assetTable } from "~/drizzle/schema/assetTable";

import { route } from "~/frontend/asset";
import { requireUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const action: ActionFunction = async (args) => {
	const { request } = args;
	const userSession = await requireUser(args);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createDeleteAction({
		baseRoute: route,
		delete: async (id: string) => {
			return assetDeleteById(id, countryAccountsId);
		},
		tableName: getTableName(assetTable),
		getById: assetById
	})(args);
};

