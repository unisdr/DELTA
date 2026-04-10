import type {
	Asset,
	AssetListItem,
	CreateAssetData,
	UpdateAssetData,
} from "~/modules/assets/domain/entities/asset";

export interface ListAssetsQuery {
	countryAccountsId: string;
	search: string;
	builtIn?: boolean;
	offset: number;
	limit: number;
}

export interface AssetSectorDisplay {
	id: string;
	name: string;
}

export interface AssetDeleteResult {
	ok: boolean;
	error?: string;
}

export interface AssetRepositoryPort {
	count(query: Omit<ListAssetsQuery, "offset" | "limit">): Promise<number>;
	list(query: ListAssetsQuery): Promise<AssetListItem[]>;
	findById(id: string): Promise<Asset | null>;
	create(
		data: CreateAssetData,
		countryAccountsId: string,
	): Promise<{ id: string }>;
	update(
		id: string,
		countryAccountsId: string,
		data: UpdateAssetData,
	): Promise<void>;
	deleteById(id: string, countryAccountsId: string): Promise<AssetDeleteResult>;
	getSectorDisplay(sectorIds: string): Promise<AssetSectorDisplay[]>;
}
