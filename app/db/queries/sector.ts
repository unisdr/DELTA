import { sql, eq } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";

const ctx = { lang: "en" };
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema/sectorTable";

export interface Sector {
	id: string;
	name: string;
}

export function sectorSelect() {
	return dr
		.select({
			id: sectorTable.id,
			name: sql<string>`dts_jsonb_localized(${sectorTable.name}, ${ctx.lang})`.as(
				"name",
			),
			description:
				sql<string>`dts_jsonb_localized(${sectorTable.description}, ${ctx.lang})`.as(
					"description",
				),
		})
		.from(sectorTable);
}

export async function getSectorByLevel(level: number): Promise<Sector[]> {
	const rows = await sectorSelect()
		.where(eq(sectorTable.level, level))
		.orderBy(sql`name`);
	return rows;
}

export async function getSubSectorsBySectorId(
	sectorId: string,
): Promise<Sector[]> {
	const rows = await sectorSelect()
		.where(eq(sectorTable.parentId, sectorId))
		.orderBy(sql`name`);
	return rows;
}
