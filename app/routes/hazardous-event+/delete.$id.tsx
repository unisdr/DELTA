import { getTableName } from "drizzle-orm";
import { createDeleteActionWithCountryAccounts } from "~/backend.server/handlers/form/form";
import { requireUser } from "~/utils/auth";

import {
	hazardousEventById,
	hazardousEventDelete,
} from "~/backend.server/models/event";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { ActionFunction } from "react-router";


export const action: ActionFunction = async (args) => {

	const { request } = args;
	const userSession = await requireUser(args);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("No instance selected", { status: 500 });
	}

	return createDeleteActionWithCountryAccounts({
		baseRoute: "/hazardous-event",
		delete: async (id: string) => {
			return hazardousEventDelete(id, countryAccountsId);
		},
		tableName: getTableName(hazardousEventTable),
		getById: hazardousEventById,
		postProcess: async (_id: string, data: any) => {
			if (data.attachments) {
				ContentRepeaterUploadFile.delete(data.attachments);
			}
		},
		countryAccountsId,
	})(args);
};
