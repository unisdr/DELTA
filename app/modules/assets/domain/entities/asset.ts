export interface Asset {
	id: string;
	name: string;
	category: string;
	notes: string;
	sectorIds: string;
	isBuiltIn: boolean;
	nationalId: string | null;
	countryAccountsId: string | null;
	apiImportId: string | null;
}

export interface AssetListItem {
	id: string;
	name: string;
	sectorIds: string;
	sectorNames: string;
	isBuiltIn: boolean;
}

/** Flat form model used by the create/edit form. */
export interface AssetFormFields {
	name: string;
	category: string;
	notes: string;
	sectorIds: string;
	nationalId?: string | null;
	isBuiltIn?: boolean;
	countryAccountsId?: string | null;
	apiImportId?: string | null;
}

export interface CreateAssetData {
	name: string;
	category: string;
	notes: string;
	sectorIds: string;
	nationalId?: string | null;
}

export interface UpdateAssetData {
	name?: string;
	category?: string;
	notes?: string;
	sectorIds?: string;
	nationalId?: string | null;
}

export interface AssetsPagination {
	totalItems: number;
	itemsOnThisPage: number;
	page: number;
	pageSize: number;
	extraParams: Record<string, string[]>;
}

export interface AssetsListResult {
	items: AssetListItem[];
	pagination: AssetsPagination;
}
