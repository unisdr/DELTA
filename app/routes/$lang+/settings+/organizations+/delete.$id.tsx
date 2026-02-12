import { ActionFunction } from "react-router";
import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form/form";
import { organizationById, organizationDeleteById } from "~/backend.server/models/organization";
import { organizationTable } from "~/drizzle/schema/organizationTable";

import { route } from "~/frontend/organization";
import { requireUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { authLoaderWithPerm } from "~/utils/auth";

export const loader = authLoaderWithPerm("ManageOrganizations", async (args) => {
	const { request, params } = args;
	if (!params.id) throw new Error("Missing id param");
	const countryAccountsId = await getCountryAccountsIdFromSession(request)
	if (!countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	return {};
});

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
			return organizationDeleteById(id, countryAccountsId);
		},
		tableName: getTableName(organizationTable),
		getById: organizationById
	})(args);
};

