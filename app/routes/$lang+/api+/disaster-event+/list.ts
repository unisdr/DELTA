import { dr } from "~/db.server";

import { sql, desc, eq } from "drizzle-orm";

import { authLoaderApi } from "~/util/auth";

import { createApiListLoader } from "~/backend.server/handlers/view";

import { disasterEventTable, hipClusterTable, hipHazardTable, hipTypeTable } from "~/drizzle/schema";
import { apiAuth } from "~/backend.server/models/api_key";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApi(async (args) => {
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
				disasterEventTable,
				eq(disasterEventTable.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return dr.query.disasterEventTable.findMany({
				...offsetLimit,
				where: eq(disasterEventTable.countryAccountsId, countryAccountsId),
				orderBy: [desc(disasterEventTable.startDate)],
				with: {
					hipHazard: {
						columns: {
							id: true,
							code: true
						},
						extras: {
							name: sql<string>`${hipHazardTable.name}->>${ctx.lang}`.as("name"),
						}
					},
					hipCluster: {
						columns: {
							id: true,
						},
						extras: {
							name: sql<string>`${hipClusterTable.name}->>${ctx.lang}`.as("name"),
						}
					},
					hipType: {
						columns: {
							id: true,
						},
						extras: {
							name: sql<string>`${hipTypeTable.name}->>${ctx.lang}`.as("name"),
						}
					},
				}
			});
		}
	)(args);
});
