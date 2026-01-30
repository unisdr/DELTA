import { sql, eq, isNull } from 'drizzle-orm';
import { BackendContext } from '~/backend.server/context';
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";

export interface Sector {
	id: string;
	parentId: string | null;
	sectorname: string;
	description: string | null;
	updatedAt: Date | null;
	createdAt: Date;
}

export type SectorType = Omit<Sector, 'id'> & {
	id?: string;
};

export function sectorSelect(ctx: BackendContext) {
	return dr.select({
			id: sectorTable.id,
			sectorname: sql<string>`dts_jsonb_localized(${sectorTable.name}, ${ctx.lang})`.as('sectorname'),
			parentId: sectorTable.parentId,
			description: sql<string>`dts_jsonb_localized(${sectorTable.description}, ${ctx.lang})`.as('description'),
			updatedAt: sectorTable.updatedAt,
			createdAt: sectorTable.createdAt
		})
}	

export const fetchAllSectors = async (ctx: BackendContext): Promise<Sector[]> => {
	return await sectorSelect(ctx)
		.from(sectorTable)
		.orderBy(sql`NAME`);
};

export const getSectorsByParentId = async (
	ctx: BackendContext,
	parentId: string | null
): Promise<Sector[]> => {

	const rows = parentId
		? await sectorSelect(ctx)
			.from(sectorTable)
			.where(eq(sectorTable.parentId, parentId))
			.orderBy(sql`name`)
			.execute()
		: await sectorSelect(ctx)
			.from(sectorTable)
			.where(isNull(sectorTable.parentId))
			.orderBy(sql`name`)
			.execute();

	return rows;
};

export const getMidLevelSectors = async (
	ctx: BackendContext
): Promise<Sector[]> => {
	// First get the top level sectors (infrastructure, etc)
	const topLevelSectors = await sectorSelect(ctx)
		.from(sectorTable)
		.where(isNull(sectorTable.parentId))
		.orderBy(sql`name`);

	// Then get their immediate children (energy, agriculture, etc)
	const midLevelSectors = await Promise.all(
		topLevelSectors.map(async (topSector) => {
			const children = await sectorSelect(ctx)
				.from(sectorTable)
				.where(eq(sectorTable.parentId, topSector.id))
				.orderBy(sql`name`);

			return children;
		})
	);

	// Flatten the array of arrays into a single array
	return midLevelSectors.flat();
};

export const getSubsectorsByParentId = async (
	ctx: BackendContext,
	parentId: string
): Promise<Sector[]> => {
	const rows = await sectorSelect(ctx)
		.from(sectorTable)
		.where(eq(sectorTable.parentId, parentId))
		.orderBy(sql`name`);

	return rows;
};

