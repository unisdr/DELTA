import { dr } from "~/db.server";

import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { sql, eq } from "drizzle-orm";

const ctx: any = { t: (message: any, _v?: any) => message?.msg ?? "", lang: "en", url: (p: string) => p, fullUrl: (p: string) => p, rootUrl: () => "/" };




/**
 * Fetch hazard clusters from the database.
 */
export async function fetchHazardClusters(typeId: string | null) {
	const query = dr
		.select({
			id: hipClusterTable.id,
			name: sql<string>`dts_jsonb_localized(${hipClusterTable.name}, ${ctx.lang})`.as(
				"name",
			),
			typeId: hipClusterTable.typeId,
		})
		.from(hipClusterTable)
		.orderBy(sql`name`);

	if (typeId !== null) {
		query.where(eq(hipClusterTable.typeId, typeId));
	}

	const rows = await query;

	return rows;
}
