import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { InsertDivision } from "~/drizzle/schema/divisionTable";
import {
	divisionBreadcrumb,
	divisionById,
	divisionsAllLanguages,
	update,
} from "~/backend.server/models/division";
import type {
	GeographicLevelDetail,
	GeographicLevelListItem,
	GeographicLevelTreeItem,
} from "~/modules/geographic-levels/domain/entities/geographic-level";
import type { GeographicLevelRepositoryPort } from "~/modules/geographic-levels/domain/repositories/geographic-level-repository";
import type { Dr } from "~/modules/geographic-levels/infrastructure/db/client.server";
import { divisionTable } from "~/modules/geographic-levels/infrastructure/db/schema";

export class DrizzleGeographicLevelRepository implements GeographicLevelRepositoryPort {
	constructor(private readonly db: Dr) {}

	async getLanguageCounts(
		parentId: string | null,
		countryAccountsId: string,
	): Promise<Record<string, number>> {
		return divisionsAllLanguages(parentId, [], countryAccountsId);
	}

	async getBreadcrumb(divisionId: string, countryAccountsId: string) {
		return divisionBreadcrumb(["en"], divisionId, countryAccountsId);
	}

	async countByParent(
		parentId: string | null,
		countryAccountsId: string,
	): Promise<number> {
		const condition = and(
			parentId
				? eq(divisionTable.parentId, parentId)
				: isNull(divisionTable.parentId),
			eq(divisionTable.countryAccountsId, countryAccountsId),
		);
		return this.db.$count(divisionTable, condition);
	}

	async listByParent(
		parentId: string | null,
		countryAccountsId: string,
		offset: number,
		limit: number,
	): Promise<GeographicLevelListItem[]> {
		const condition = and(
			parentId
				? eq(divisionTable.parentId, parentId)
				: isNull(divisionTable.parentId),
			eq(divisionTable.countryAccountsId, countryAccountsId),
		);

		const rows = await this.db
			.select({
				id: divisionTable.id,
				nationalId: divisionTable.nationalId,
				name: divisionTable.name,
				hasChildren: sql<boolean>`EXISTS (
					SELECT 1
					FROM ${divisionTable} AS children
					WHERE children.${divisionTable.parentId} = ${divisionTable}.id
				)`.as("hasChildren"),
			})
			.from(divisionTable)
			.where(condition)
			.offset(offset)
			.limit(limit)
			.orderBy(asc(divisionTable.id));

		return rows as GeographicLevelListItem[];
	}

	async listAllForTree(
		countryAccountsId: string,
	): Promise<GeographicLevelTreeItem[]> {
		const rows = await this.db
			.select({
				id: divisionTable.id,
				nationalId: divisionTable.nationalId,
				name: divisionTable.name,
				parentId: divisionTable.parentId,
			})
			.from(divisionTable)
			.where(eq(divisionTable.countryAccountsId, countryAccountsId));

		return rows as GeographicLevelTreeItem[];
	}

	async findById(
		id: string,
		countryAccountsId: string,
	): Promise<GeographicLevelDetail | null> {
		const rows = await this.db
			.select()
			.from(divisionTable)
			.where(
				and(
					eq(divisionTable.id, id),
					eq(divisionTable.countryAccountsId, countryAccountsId),
				),
			)
			.limit(1);

		if (!rows.length) return null;
		return rows[0] as GeographicLevelDetail;
	}

	async update(
		id: string,
		data: InsertDivision,
		countryAccountsId: string,
	): Promise<{ ok: boolean; errors?: string[] }> {
		return update(id, data, countryAccountsId);
	}

	async findDivisionById(id: string, countryAccountsId: string) {
		return divisionById(id, countryAccountsId);
	}

	async listForCsv(countryAccountsId: string) {
		return this.db.query.divisionTable.findMany({
			columns: {
				id: true,
				importId: true,
				parentId: true,
				name: true,
			},
			where: eq(divisionTable.countryAccountsId, countryAccountsId),
			orderBy: [asc(divisionTable.id)],
		});
	}
}
