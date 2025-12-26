import { eq } from 'drizzle-orm';
import { BackendContext } from '~/backend.server/context';
import { dr } from '~/db.server';
import { sectorTable, SelectSector } from '~/drizzle/schema';

export async function getSectorByLevel(ctx: BackendContext, level: number) {
	const rows = await dr
		.select()
		.from(sectorTable)
		.where(eq(sectorTable.level, level))
		.orderBy(sectorTable.sectorname);

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
}

export async function getSubSectorsBySectorId(ctx: BackendContext, sectorId: string): Promise<SelectSector[]> {
	const rows = await dr
		.select()
		.from(sectorTable)
		.where(eq(sectorTable.parentId, sectorId))
		.orderBy(sectorTable.sectorname);

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
}

