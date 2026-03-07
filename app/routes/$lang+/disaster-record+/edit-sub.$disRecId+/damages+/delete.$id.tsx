import { getTableName } from "drizzle-orm";
import {
	damagesById,
	damagesDeleteById,
} from "~/backend.server/models/damages";
import { damagesTable } from "~/drizzle/schema/damagesTable";

import { route2 } from "~/frontend/damages";

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
		delete: async (id: string) => {
			return damagesDeleteById(id, countryAccountsId);
		},
		tableName: getTableName(damagesTable),
		getById: damagesById,
		postProcess: async (_id, data) => {
			ContentRepeaterUploadFile.delete(data.attachments);
		},
		countryAccountsId,
	})(args);
}