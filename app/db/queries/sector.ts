import { sql, eq } from 'drizzle-orm';
import { BackendContext } from '~/backend.server/context';
import { dr } from '~/db.server';
import { sectorTable } from '~/drizzle/schema';

export interface Sector {
	id: string
	name: string
}

export function sectorSelect(ctx: BackendContext) {
	return dr
		.select({
			id: sectorTable.id,
			name: sql<string>`${sectorTable.name}->>${ctx.lang}`.as('name'),
			description: sql<string>`${sectorTable.description}->>${ctx.lang}`.as('description'),
		})
		.from(sectorTable)
}

export async function getSectorByLevel(ctx: BackendContext, level: number): Promise<Sector[]> {
	const rows = await sectorSelect(ctx)
		.where(eq(sectorTable.level, level))
		.orderBy(sql`name`);
	return rows;
}

export async function getSubSectorsBySectorId(ctx: BackendContext, sectorId: string): Promise<Sector[]> {
	const rows = await sectorSelect(ctx)
		.where(eq(sectorTable.parentId, sectorId))
		.orderBy(sql`name`);
	return rows;
}

