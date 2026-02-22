import { dr } from "~/db.server";
import { hipHazardTable } from "~/drizzle/schema/hipHazardTable";
import { hipClusterTable } from "~/drizzle/schema/hipClusterTable";
import { hipTypeTable } from "~/drizzle/schema/hipTypeTable";
import { eq } from "drizzle-orm";

/**
 * Fetch related Hazard cluster and Hazard type based on Specific hazard ID.
 * @param specificHazardId - ID of the specific hazard
 * @returns Object containing hazardTypeId and hazardClusterId
 */
export async function fetchRelatedHazardData(specificHazardId: string) {
	try {
		// Perform a join query to fetch related hazard cluster and hazard type
		const result = await dr
			.select({
				hazardClusterId: hipClusterTable.id,
				hazardTypeId: hipTypeTable.id,
			})
			.from(hipHazardTable)
			.leftJoin(
				hipClusterTable,
				eq(hipHazardTable.clusterId, hipClusterTable.id),
			)
			.leftJoin(hipTypeTable, eq(hipClusterTable.typeId, hipTypeTable.id))
			.where(eq(hipHazardTable.id, specificHazardId));

		// Return the first result (if any)
		return result[0] || null;
	} catch (error) {
		console.error("Error in fetchRelatedHazardData:", error);
		throw new Error("Database query failed");
	}
}
