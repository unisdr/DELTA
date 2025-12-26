import { dr } from "~/db.server";
import { hipClusterTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";
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
      name: hipClusterTable.nameEn,
      typeId: hipClusterTable.typeId,
    })
    .from(hipClusterTable)
    .orderBy(hipClusterTable.nameEn);

  if (typeId !== null) {
    query.where(eq(hipClusterTable.typeId, typeId));
  }

  const rows = await query;

  for (const row of rows) {
    row.name = ctx.dbt({
      type: "hip_cluster.name",
      id: String(row.id),
      msg: row.name,
    });
  }

  return rows;
}
