import { getTableName } from "drizzle-orm";
import { createDeleteActionWithCountryAccounts } from "~/backend.server/handlers/form/form";
import {
	disasterRecordsById,
	deleteAllDataByDisasterRecordId,
} from "~/backend.server/models/disaster_record";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";

import { route } from "~/frontend/disaster-record/form";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { requireUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { ActionFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const ctx = new BackendContext(args);
	const userSession = await requireUser(args);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const deleteWithTenant = async (id: string) => {
		return deleteAllDataByDisasterRecordId(ctx, id, countryAccountsId);
	};

	const getByIdWithTenant = async (_ctx: BackendContext, id: string) => {
		return disasterRecordsById(id, countryAccountsId);
	};

	const actionHandler = createDeleteActionWithCountryAccounts({
		baseRoute: route,
		delete: deleteWithTenant,
		tableName: getTableName(disasterRecordsTable),
		getById: getByIdWithTenant,
		postProcess: async (id, data) => {
			console.log(`Post-processing record: ${id}`);
			ContentRepeaterUploadFile.delete(data.attachments);
		},
		countryAccountsId,
	});

	return actionHandler(args);
};
