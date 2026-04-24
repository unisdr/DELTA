import { assetTable } from "~/drizzle/schema/assetTable";
import { sectorTable } from "~/drizzle/schema/sectorTable";

import { dr } from "~/db.server";

import { and, eq, or, sql } from "drizzle-orm";

/**
 * Checks if a given asset (by asset ID) belongs to a specific sector within a country account.
 *
 * This function queries the asset table for a record matching the provided asset ID and country account ID,
 * and verifies if the given sectorId is present in the asset's sectorIds (comma-separated UUIDs).
 *
 * @param id - The asset's unique identifier (UUID)
 * @param sectorId - The sector's unique identifier (UUID) to check for membership
 * @param countryAccountsId - The country account's unique identifier (UUID)
 * @returns Promise<boolean> - True if the asset is in the sector, false otherwise
 */
export async function isAssetInSectorByAssetId(
	id: string,
	sectorId: string,
	countryAccountsId: string,
): Promise<boolean> {
	let assetSectorChildren: string[] = [];
	const assetSectorIds = await dr.query.assetTable.findFirst({
		where: or(
			and(eq(assetTable.id, id), eq(assetTable.isBuiltIn, true)),
			and(
				eq(assetTable.id, id),
				eq(assetTable.isBuiltIn, false),
				eq(assetTable.countryAccountsId, countryAccountsId),
			),
		),
		columns: {
			sectorIds: true,
		},
	});

	if (assetSectorIds) {
		const sectorIdsArray = assetSectorIds.sectorIds.split(",");
		for (const itemSectorId of sectorIdsArray) {
			const children = await dr
				.select({
					id: sectorTable.id,
					name: sql<string>`dts_jsonb_localized(${sectorTable.name}, ${"en"})`.as(
						"name",
					),
					childrenSectorIds: sql`(
						SELECT array_to_string(
						dts_get_sector_children_idonly(${sectorTable.id}), ',')
					)`.as("childrenSectorIds"),
				})
				.from(sectorTable)
				.where(eq(sectorTable.id, itemSectorId));
			if (children.length > 0) {
				const xValue = children[0].childrenSectorIds as string;
				assetSectorChildren.push(...xValue.split(","));
			}
		}

		if (assetSectorChildren.includes(sectorId)) {
			return true;
		}
	}

	return false;
}
