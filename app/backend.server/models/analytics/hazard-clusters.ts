import { dr } from "~/db.server";

const ctx: any = { t: (message: { msg: string }) => message.msg, lang: 'en', url: (path: string) => path, fullUrl: (path: string) => path, rootUrl: () => '/', user: undefined };
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { sql, eq } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";

/**
 * Fetch hazard clusters from the database.
 */
export async function fetchHazardClusters(
	typeId: string | null,
) {
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

