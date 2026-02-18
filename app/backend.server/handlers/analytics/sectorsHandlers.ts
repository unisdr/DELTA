import { BackendContext } from "~/backend.server/context";
import {
	getMidLevelSectors,
	getSubsectorsByParentId,
	Sector,
} from "~/backend.server/models/analytics/sectors";

export interface SectorWithSubsectors extends Omit<Sector, "subsectors"> {
	subsectors: Sector[];
}

export const getSectorsWithSubsectors = async (
	ctx: BackendContext,
): Promise<SectorWithSubsectors[]> => {
	// Get all mid-level sectors (e.g., Energy, Agriculture)
	const sectors = await getMidLevelSectors(ctx);

	// For each sector, get its subsectors (e.g., Energy Equipment, Crops)
	const sectorsWithSubs = await Promise.all(
		sectors.map(async (sector) => {
			const subsectors = await getSubsectorsByParentId(ctx, sector.id);
			return {
				...sector,
				subsectors,
			};
		}),
	);

	return sectorsWithSubs;
};
