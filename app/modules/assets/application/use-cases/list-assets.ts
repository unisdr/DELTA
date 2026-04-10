import type { AssetsListResult } from "~/modules/assets/domain/entities/asset";
import type { AssetRepositoryPort } from "~/modules/assets/domain/repositories/asset-repository";

export interface ListAssetsInput {
	countryAccountsId: string;
	search: string;
	builtIn?: boolean;
	page: number;
	pageSize: number;
}

export class ListAssetsUseCase {
	constructor(private readonly repository: AssetRepositoryPort) {}

	async execute(input: ListAssetsInput): Promise<AssetsListResult> {
		const offset = (input.page - 1) * input.pageSize;

		const [totalItems, items] = await Promise.all([
			this.repository.count({
				countryAccountsId: input.countryAccountsId,
				search: input.search,
				builtIn: input.builtIn,
			}),
			this.repository.list({
				countryAccountsId: input.countryAccountsId,
				search: input.search,
				builtIn: input.builtIn,
				offset,
				limit: input.pageSize,
			}),
		]);

		return {
			items,
			pagination: {
				totalItems,
				itemsOnThisPage: items.length,
				page: input.page,
				pageSize: input.pageSize,
				extraParams: {},
			},
		};
	}
}
