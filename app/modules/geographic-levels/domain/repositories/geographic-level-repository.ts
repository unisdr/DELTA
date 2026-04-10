import type { DivisionBreadcrumbRow } from "~/backend.server/models/division";
import type { InsertDivision } from "~/drizzle/schema/divisionTable";
import type {
	GeographicLevelDetail,
	GeographicLevelListItem,
	GeographicLevelTreeItem,
} from "~/modules/geographic-levels/domain/entities/geographic-level";

export interface GeographicLevelRepositoryPort {
	getLanguageCounts(
		parentId: string | null,
		countryAccountsId: string,
	): Promise<Record<string, number>>;
	getBreadcrumb(
		divisionId: string,
		countryAccountsId: string,
	): Promise<DivisionBreadcrumbRow[]>;
	countByParent(
		parentId: string | null,
		countryAccountsId: string,
	): Promise<number>;
	listByParent(
		parentId: string | null,
		countryAccountsId: string,
		offset: number,
		limit: number,
	): Promise<GeographicLevelListItem[]>;
	listAllForTree(countryAccountsId: string): Promise<GeographicLevelTreeItem[]>;
	findById(
		id: string,
		countryAccountsId: string,
	): Promise<GeographicLevelDetail | null>;
	update(
		id: string,
		data: InsertDivision,
		countryAccountsId: string,
	): Promise<{ ok: boolean; errors?: string[] }>;
	findDivisionById(id: string, countryAccountsId: string): Promise<any>;
	listForCsv(countryAccountsId: string): Promise<
		Array<{
			id: string;
			importId: string | null;
			parentId: string | null;
			name: Record<string, string>;
		}>
	>;
}
