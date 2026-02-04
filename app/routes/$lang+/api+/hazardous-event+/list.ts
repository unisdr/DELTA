import { hazardousEventTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { sql, desc, eq } from "drizzle-orm";
import { createApiListLoader } from "~/backend.server/handlers/view";
import { LoaderFunctionArgs } from "react-router";
import { apiAuth } from "~/backend.server/models/api_key";
import { BackendContext } from "~/backend.server/context";
import { hipClusterTable, hipHazardTable, hipTypeTable } from "~/drizzle/schema";

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
				hazardousEventTable,
				eq(hazardousEventTable.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return await dr.query.hazardousEventTable.findMany({
				...offsetLimit,
				where: eq(hazardousEventTable.countryAccountsId, countryAccountsId),
				orderBy: [desc(hazardousEventTable.startDate)],
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
					event: {
						columns: {},
						with: {
							ps: true,
							cs: true
						}
					}
				},
			});
		}
	)(args);
};
