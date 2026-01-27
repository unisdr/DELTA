
import { sql, eq } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";
import { dr } from "~/db.server";
import { hipTypeTable } from "~/drizzle/schema";

export interface HazardType {
	id: string;
	name: string;
}

/**
 * Fetch hazard types directly from the database.
 * @returns Array of hazard types.
 */
export const fetchHazardTypes = async (
	ctx: BackendContext
): Promise<HazardType[]> => {
	try {
		const hazardTypes = await dr
			.select({
				id: hipTypeTable.id,
				name: sql<string>`${hipTypeTable.name}->>${ctx.lang}`.as('name'),
			})
			.from(hipTypeTable)
			.orderBy(sql`name`);
		return hazardTypes;
	} catch (error) {
		console.error("[fetchHazardTypes] Error fetching hazard types:", error);
		throw new Error("Failed to fetch hazard types from the database.");
	}
};

// Fetches a hazard type record by its ID.
export async function getHazardTypeById(ctx: BackendContext, hazardTypeId: string) {
	const result = await dr
		.select({
			id: hipTypeTable.id,
			name: sql<string>`${hipTypeTable.name}->>${ctx.lang}`.as('name'),
		})
		.from(hipTypeTable)
		.where(eq(hipTypeTable.id, hazardTypeId));

	if (result.length === 0) {
		return null;
	}

	const row = result[0];

	return row;
}
