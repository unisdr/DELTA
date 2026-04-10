import type { DivisionBreadcrumbRow } from "~/backend.server/models/division";

export interface GeographicLevelListItem {
	id: string;
	nationalId: string | null;
	hasChildren: boolean;
	name: Record<string, string>;
}

export interface GeographicLevelTreeItem {
	id: string;
	nationalId: string | null;
	name: Record<string, string>;
	parentId: string | null;
}

export interface GeographicLevelDetail {
	id: string;
	importId: string | null;
	nationalId: string | null;
	parentId: string | null;
	level: number | null;
	name: Record<string, string>;
	geojson: unknown;
	countryAccountsId: string | null;
}

export interface GeographicLevelsPageData {
	langs: Record<string, number>;
	selectedLangs: string[];
	breadcrumbs: DivisionBreadcrumbRow[] | null;
	treeData: unknown[];
	items: GeographicLevelListItem[];
	pagination: {
		totalItems: number;
		itemsOnThisPage: number;
		page: number;
		pageSize: number;
		extraParams: Record<string, string[]>;
	};
}
