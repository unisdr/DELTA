import { getTableName } from "drizzle-orm";
import {
	createDeleteActionWithCountryAccounts,
} from "~/backend.server/handlers/form/form";
import { requireUser } from "~/utils/auth";

import {
	disasterEventById,
	disasterEventDelete
} from "~/backend.server/models/event";
import { disasterEventTable } from "~/drizzle/schema";
import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

import {
	route,
} from "~/frontend/events/disastereventform";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { ActionFunction } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const action: ActionFunction = async (args) => {
	const ctx = new BackendContext(args);
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
		baseRoute: route,
		delete: async (id: string) => {
			return disasterEventDelete(ctx, id, countryAccountsId);
		},
		tableName: getTableName(disasterEventTable),
		getById: disasterEventById,
		postProcess: async (_id: string, data: any) => {
			if (data.attachments) {
				ContentRepeaterUploadFile.delete(data.attachments);
			}
		},
		countryAccountsId,
	})(args);
};



