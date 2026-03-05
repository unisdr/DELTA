import { getTableName } from "drizzle-orm";
import { lossesById, lossesDeleteById } from "~/backend.server/models/losses";
import { lossesTable } from "~/drizzle/schema/lossesTable";

import { route, route2 } from "~/frontend/losses";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { createDeleteActionWithCountryAccounts } from "~/backend.server/handlers/form/form";
import { ActionFunction } from "react-router";
import { requireUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const action: ActionFunction = async (args) => {
	const { request } = args;
	const userSession = await requireUser(args);

	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized, no instance selected.", { status: 401 });
	}


	return createDeleteActionWithCountryAccounts({
		redirectToSuccess: (_id: string, oldRecord: any) =>
			route2(oldRecord.recordId) + "?sectorId=" + oldRecord.sectorId,
		baseRoute: route,
		delete: lossesDeleteById,
		tableName: getTableName(lossesTable),
		getById: lossesById,
		postProcess: async (_id, data) => {
			//console.log(`Post-processing record: ${id}`);
			//console.log(`Data before deletion:`, data);

			ContentRepeaterUploadFile.delete(data.attachments);
		},
		countryAccountsId,
	})(args);
};
