import { disasterRecordsTable, hipTypeTable, hipHazardTable, hipClusterTable } from "~/drizzle/schema";

import { dr } from "~/db.server";
import { sql, desc, eq } from "drizzle-orm";

import { apiAuth } from "~/backend.server/models/api_key";
import { createApiListLoader } from "~/backend.server/handlers/view";
import { LoaderFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const loader = async (args: LoaderFunctionArgs) => {
	const ctx = new BackendContext(args);
	const { request } = args;
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return createApiListLoader(
		async () => {
			return dr.$count(
				disasterRecordsTable,
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return dr.query.disasterRecordsTable.findMany({
				...offsetLimit,
				with: {
					hipHazard: {
						columns: { id: true, code: true },
						extras: {
							name: sql<string>`dts_jsonb_localized(${hipHazardTable.name}, ${ctx.lang})`.as('name'),
						},
					},
					hipCluster: {
						columns: { id: true },
						extras: {
							name: sql<string>`dts_jsonb_localized(${hipClusterTable.name}, ${ctx.lang})`.as('name'),
						},
					},
					hipType: {
						columns: { id: true },
						extras: {
							name: sql<string>`dts_jsonb_localized(${hipTypeTable.name}, ${ctx.lang})`.as('name'),
						},
					},
				},
				where: eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
				orderBy: [desc(disasterRecordsTable.id)],
			});
		}
	)(args);
};
