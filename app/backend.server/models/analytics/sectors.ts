import { sql, eq, isNull } from "drizzle-orm";

const ctx: any = { t: (message: { msg: string }) => message.msg, lang: 'en', url: (path: string) => path, fullUrl: (path: string) => path, rootUrl: () => '/', user: undefined };
import { BackendContext } from "~/backend.server/context";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema/sectorTable";

export interface Sector {
	id: string;
	parentId: string | null;
	sectorname: string;
	description: string | null;
	updatedAt: Date | null;
	createdAt: Date;
}

export type SectorType = Omit<Sector, "id"> & {
	id?: string;
};

export function sectorSelect() {
	return dr.select({
		id: sectorTable.id,
		sectorname:
			sql<string>`dts_jsonb_localized(${sectorTable.name}, ${ctx.lang})`.as(
				"sectorname",
			),
		parentId: sectorTable.parentId,
		description:
			sql<string>`dts_jsonb_localized(${sectorTable.description}, ${ctx.lang})`.as(
				"description",
			),
		updatedAt: sectorTable.updatedAt,
		createdAt: sectorTable.createdAt,
	});
}

export const fetchAllSectors = async (
): Promise<Sector[]> => {
	return await sectorSelect()
		.from(sectorTable)
		.orderBy(sql`NAME`);
};

export const getSectorsByParentId = async (
	parentId: string | null,
): Promise<Sector[]> => {
	const rows = parentId
		? await sectorSelect()
				.from(sectorTable)
				.where(eq(sectorTable.parentId, parentId))
				.orderBy(sql`name`)
				.execute()
		: await sectorSelect()
				.from(sectorTable)
				.where(isNull(sectorTable.parentId))
				.orderBy(sql`name`)
				.execute();

	return rows;
};

export const getMidLevelSectors = async (
): Promise<Sector[]> => {
	// First get the top level sectors (infrastructure, etc)
	const topLevelSectors = await sectorSelect()
		.from(sectorTable)
		.where(isNull(sectorTable.parentId))
		.orderBy(sql`name`);

	// Then get their immediate children (energy, agriculture, etc)
	const midLevelSectors = await Promise.all(
		topLevelSectors.map(async (topSector) => {
			const children = await sectorSelect()
				.from(sectorTable)
				.where(eq(sectorTable.parentId, topSector.id))
				.orderBy(sql`name`);

			return children;
		}),
	);

	// Flatten the array of arrays into a single array
	return midLevelSectors.flat();
};

export const getSubsectorsByParentId = async (
	parentId: string,
): Promise<Sector[]> => {
	const rows = await sectorSelect()
		.from(sectorTable)
		.where(eq(sectorTable.parentId, parentId))
		.orderBy(sql`name`);

	return rows;
};

