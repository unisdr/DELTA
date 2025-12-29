import { asc, eq, isNull } from 'drizzle-orm';
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

export const fetchAllSectors = async (): Promise<Sector[]> => {
	return await dr
		.select()
		.from(sectorTable)
		.orderBy(asc(sectorTable.sectorname));
};

export const getSectorsByParentId = async (
	ctx: BackendContext,
	parentId: string | null
): Promise<Sector[]> => {
	const select = {
		id: sectorTable.id,
		sectorname: sectorTable.sectorname,
		parentId: sectorTable.parentId,
		description: sectorTable.description,
		updatedAt: sectorTable.updatedAt,
		createdAt: sectorTable.createdAt,
	};

	const rows = parentId
		? await dr
			.select(select)
			.from(sectorTable)
			.where(eq(sectorTable.parentId, parentId))
			.orderBy(asc(sectorTable.sectorname))
			.execute()
		: await dr
			.select(select)
			.from(sectorTable)
			.where(isNull(sectorTable.parentId))
			.orderBy(asc(sectorTable.sectorname))
			.execute();

	return rows.map((row) => ({
		...row,
		sectorname: ctx.dbt({
			type: "sector.name",
			id: String(row.id),
			msg: row.sectorname,
		}),
	}));
};

export const getMidLevelSectors = async (
	ctx: BackendContext
): Promise<Sector[]> => {
	// First get the top level sectors (infrastructure, etc)
	const topLevelSectors = await dr
		.select()
		.from(sectorTable)
		.where(isNull(sectorTable.parentId))
		.orderBy(asc(sectorTable.sectorname));

	// Then get their immediate children (energy, agriculture, etc)
	const midLevelSectors = await Promise.all(
		topLevelSectors.map(async (topSector) => {
			const children = await dr
				.select()
				.from(sectorTable)
				.where(eq(sectorTable.parentId, topSector.id))
				.orderBy(asc(sectorTable.sectorname));

			// Translate in place
			for (const row of children) {
				row.sectorname = ctx.dbt({
					type: "sector.name",
					id: String(row.id),
					msg: row.sectorname,
				});

				if (row.description) {
					row.description = ctx.dbt({
						type: "sector.description",
						id: String(row.id),
						msg: row.description,
					});
				}
			}

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
	const rows = await dr
		.select()
		.from(sectorTable)
		.where(eq(sectorTable.parentId, parentId))
		.orderBy(asc(sectorTable.sectorname));

	for (const row of rows) {
		row.sectorname = ctx.dbt({
			type: "sector.name",
			id: String(row.id),
			msg: row.sectorname,
		});

		if (row.description) {
			row.description = ctx.dbt({
				type: "sector.description",
				id: String(row.id),
				msg: row.description,
			});
		}
	}

	return rows;
};

export const upsertSector = async (record: SectorType): Promise<void> => {
	await dr
		.insert(sectorTable)
		.values({
			id: record.id,
			sectorname: record.sectorname,
			parentId: record.parentId ?? null,
			description: record.description ?? null,
			updatedAt: new Date(),
			createdAt: record.createdAt ?? new Date(),
		})
		.onConflictDoUpdate({
			target: sectorTable.id,
			set: {
				sectorname: record.sectorname,
				parentId: record.parentId ?? null,
				description: record.description ?? null,
				updatedAt: new Date(),
			},
		});
};
