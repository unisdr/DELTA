import { BackendContext } from "~/backend.server/context";
import { dr } from "~/db.server";
import { hipHazardTable } from "~/drizzle/schema";

/**
 * Fetch specific hazards from the database based on clusterId and searchQuery.
 */
export async function fetchSpecificHazards(
	ctx: BackendContext,
	clusterId?: number,
	searchQuery: string = ""
) {
	// Load all hazards
	const rows = await dr
		.select({
			id: hipHazardTable.id,
			name: hipHazardTable.nameEn,
			clusterId: hipHazardTable.clusterId,
		})
		.from(hipHazardTable);

	// First: translate all names in place
	for (const row of rows) {
		row.name = ctx.dbt({
			type: "hip_hazard.name",
			id: String(row.id),
			msg: row.name,
		});
	}

	const query = searchQuery.trim().toLowerCase();

	// Second: filter based on clusterId and search query
	return rows.filter((row) => {
		// Cluster filter
		if (clusterId !== undefined && clusterId !== null) {
			if (row.clusterId !== String(clusterId)) {
				return false;
			}
		}

		// No search → include
		if (!query) {
			return true;
		}

		// Search: match ID or translated name
		return (
			String(row.id).includes(query) ||
			row.name.toLowerCase().includes(query)
		);
	});
}

export interface SpecificHazard {
	id: string;
	nameEn: string;
	clusterId: string;
}

export async function fetchAllSpecificHazards(
	ctx: BackendContext
): Promise<SpecificHazard[]> {
	const rows = await dr
		.select({
			id: hipHazardTable.id,
			nameEn: hipHazardTable.nameEn,
			clusterId: hipHazardTable.clusterId,
		})
		.from(hipHazardTable)
		.orderBy(hipHazardTable.nameEn);

	for (const row of rows) {
		row.nameEn = ctx.dbt({
			type: "hip_hazard.name",
			id: String(row.id),
			msg: row.nameEn,
		});
	}

	return rows;
}

