import { dr } from "~/db.server";
import { hipClusterTable } from "~/drizzle/schema";
import { sql, eq } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";

/**
 * Fetch hazard clusters from the database.
 */
export async function fetchHazardClusters(
	ctx: BackendContext,
	typeId: string | null
) {
	const query = dr
		.select({
			id: hipClusterTable.id,
			name: sql<string>`${hipClusterTable.name}->>${ctx.lang}`.as('name'),
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
